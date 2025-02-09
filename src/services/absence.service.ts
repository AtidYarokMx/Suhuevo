import moment from "moment";
import { IAbsence } from "@app/dtos/absence.dto";
import { IAttendance } from "@app/dtos/attendance.dto";
import { EEmployeStatus } from "@app/dtos/employee.dto";
import { AppErrorResponse } from "@app/models/app.response";
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
import { ScheduleExceptionModel } from "@app/repositories/mongoose/models/schedule-exception.model";
import { consumeSequence } from "@app/utils/sequence";
import { customLog } from "@app/utils/util.util";
import { ClientSession } from "mongoose";

class AbsenceService {
  private readonly notWorkableScheduleExceptions = ['Permiso', 'Vacaciones', 'Festivo', 'Festivo Trabajado'];

  async get(query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids];
    const records = await AbsenceModel.find({ active: true, id: { $in: ids } });
    const result: any = {};
    for (const record of records) result[record.id] = record;
    return result;
  }

  async search(query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query;
    const allowedFields: (keyof IAbsence)[] = ['id', 'employeeId', 'employeeName', 'date', 'isJustified', 'reason'];
    const filter: any = { active: true };
    const selection: any = size === 'small' ? {} : { active: 0, _id: 0, __v: 0 };

    for (const field in queryFields) {
      if (!(allowedFields as any[]).includes(field.replace(/[~<>]/, ''))) {
        throw new AppErrorResponse({ statusCode: 403, name: `Campo no permitido: ${field}` });
      }
      const value = queryFields[field];
      const cleanField = field.replace(/[~<>]/, '');
      if (Array.isArray(value)) {
        filter[cleanField] = { $in: value };
      } else if (field.startsWith('~')) {
        filter[cleanField] = new RegExp('' + String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      } else if (field.startsWith('<')) {
        filter[cleanField] = { ...filter[cleanField], $lt: value };
      } else if (field.startsWith('>')) {
        filter[cleanField] = { ...filter[cleanField], $gt: value };
      } else {
        filter[cleanField] = value;
      }
    }

    const records = await AbsenceModel.find(filter).select(selection).limit(limit).sort({ createdAt: 'desc' });
    if (records.length === 0) return [];
    return this.reformatData(records);
  }

  async update(body: any, session: ClientSession): Promise<any> {
    console.log(body);
    const record = await AbsenceModel.findOne({ active: true, id: body.id });
    if (!record) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró la falta' });

    const allowedFields: (keyof IAbsence)[] = ['isJustified', 'reason'];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (record as any)[field] = body[field];
      }
    }

    await record.save({ validateBeforeSave: true, validateModifiedOnly: true, session });
    return { id: record.id };
  }

  // -----------------------------------------------------------------------------------
  // Función mejorada para generar ausencias diarias
  async generateDailyAbsences(body: any, session: ClientSession): Promise<any> {
    const date = body.date;
    if (!date || !moment(date, true).isValid()) {
      throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' });
    }
    const day = moment(date).format('YYYY-MM-DD');

    // 1. Obtener todos los empleados activos
    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE });

    // 2. Obtener asistencias registradas en el día (filtrando por checkInTime que comience con el día)
    const attendances: IAttendance[] = await AttendanceModel.find({
      active: true,
      checkInTime: { $regex: `^${day}` }
    });

    // 3. Obtener ausencias ya registradas para el día
    const absences = await AbsenceModel.find({ active: true, date: day });

    // 4. Obtener excepciones de horario (permisos, vacaciones, festivos, etc.) para el día
    const scheduleExceptions = await ScheduleExceptionModel.find({
      active: true,
      name: { $in: this.notWorkableScheduleExceptions },
      $or: [
        { $and: [{ startDate: { $regex: `^${day}` } }, { allDay: true }] },
        { $and: [{ startDate: { $lte: day } }, { endDate: { $gt: day } }] }
      ]
    });

    let newAbsencesCount = 0;
    const detail: string[] = [];

    // 5. Procesar cada empleado
    for (const employee of employees) {
      const employeeName = `${employee.name} ${employee.lastName ?? ''} ${employee.secondLastName ?? ''}`.trim();

      // Obtener el horario del empleado para el día (usando el día de la semana en minúsculas)
      const dayOfWeek = moment(date).format("dddd").toLowerCase();
      const scheduleForDay = employee.schedule ? (employee.schedule as Record<string, any>)[dayOfWeek] : null;
      if (!scheduleForDay || !scheduleForDay.start) {
        detail.push(`Día no laboral para ${employeeName}`);
        continue;
      }

      // En lugar de usar find, se obtienen todos los registros de asistencia del empleado en ese día
      const employeeAttendances = attendances.filter(x => x.employeeId === employee.id);

      // Si al menos uno de los registros tiene un checkOutTime válido, consideramos que asistió
      const hasCompleteAttendance = employeeAttendances.some(a => a.checkOutTime && a.checkOutTime.trim() !== '');
      if (hasCompleteAttendance) {
        detail.push(`${employeeName} asistió`);
        continue;
      }

      // Si ya existe una ausencia para este empleado en el día, la actualizamos (en caso de que haya excepción)
      const existingAbsence = absences.find(x => x.employeeId === employee.id);
      if (existingAbsence) {
        detail.push(`Ya se había registrado una falta para ${employeeName} el ${day}`);
        const scheduleEx = scheduleExceptions.find(x => x.employeeId === employee.id);
        if (scheduleEx) {
          const paidValue = scheduleEx.name === "Festivo Trabajado" ? 2 : 1;
          existingAbsence.isPaid = true;
          existingAbsence.paidValue = paidValue;
          await existingAbsence.save({ session, validateModifiedOnly: true });
          detail.push(`Se actualizó la falta de ${employeeName} con justificación (${scheduleEx.reason})`);
        }
        continue;
      }

      // Si no hay asistencia (o el registro es incompleto) se determina la razón de la falta
      let reason = '';
      if (employeeAttendances.length === 0) {
        reason = 'No se hizo el check in';
      } else {
        reason = 'No se hizo el check out';
      }

      // Si existe una excepción para el empleado, se marca la ausencia como justificada
      const scheduleEx = scheduleExceptions.find(x => x.employeeId === employee.id);
      let isPaid = false;
      let paidValue = 1;
      if (scheduleEx) {
        reason = scheduleEx.reason || 'Falta Justificada';
        isPaid = true;
        paidValue = scheduleEx.name === "Festivo Trabajado" ? 2 : 1;
      }

      // Crear la nueva ausencia
      const id = 'AB' + String(await consumeSequence('absences', session)).padStart(8, '0');
      const record = new AbsenceModel({
        id,
        employeeId: employee.id,
        employeeName,
        date: day,
        reason,
        isPaid,
        paidValue
      });
      customLog(`Creando ausencia ${record.id} para ${employeeName} (${reason})`);
      detail.push(`Se registró una falta para ${employeeName} (${record.id}) (${reason})`);
      await record.save({ session });
      newAbsencesCount++;
    }

    customLog(detail);
    const totalAbsences = absences.length + newAbsencesCount;
    return { totalAbsences, newAbsences: newAbsencesCount, detail };
  }

  public reformatData(array: any[]): any[] {
    return array.map((record: IAbsence) => ({
      ...JSON.parse(JSON.stringify(record)),
      title: record.isJustified ? 'Falta justificada' : 'Ausente'
    }));
  }
}

const absenceService: AbsenceService = new AbsenceService();
export default absenceService;
