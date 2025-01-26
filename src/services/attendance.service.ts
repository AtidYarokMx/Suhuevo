/* lib */
import moment from 'moment'
/* repos & clients */
import { type ClientSession } from 'mongoose'
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* dtos */
import { CreateAttendanceBody, CreateAttendanceResponse, IAttendance } from '@app/dtos/attendance.dto'
import { EEmployeeAttendanceScheme, EEmployeStatus, IEmployeSchedule } from '@app/dtos/employee.dto'
/* models */
import { ScheduleExceptionModel } from '@app/repositories/mongoose/models/schedule-exception.model'
import { AttendanceModel } from '@app/repositories/mongoose/models/attendance.model'
import { EmployeeModel } from '@app/repositories/mongoose/models/employee.model'
import { AbsenceModel } from '@app/repositories/mongoose/models/absence.model'
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { consumeSequence } from '@app/utils/sequence'
import { arrayToObject, customLog } from '@app/utils/util.util'
import { calculateMinuteDifference, parse as parseDate } from '@app/utils/date.util';
import { readCsv } from '@app/utils/file.util';
import overtimeService from './overtime.service'

class AttendanceService {
  private readonly MAX_TIME_DELAY = 15;
  private readonly notWorkableScheduleExceptions = ['Permiso', 'Vaciones', 'Festivo', 'Festivo Trabajado']
  private readonly daysTranslationMap: { [key: string]: string } = { 'monday': 'lunes', 'tuesday': 'martes', 'wednesday': 'miércoles', 'thursday': 'jueves', 'friday': 'viernes', 'saturday': 'sábado', 'sunday': 'domingo' };
  // private readonly MIN_OVERTIME_MINUTES = 60;

  async get(query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids]
    const records = await AttendanceModel.find({ active: true, id: { $in: ids } })

    const result: any = {}
    for (const record of records) result[record.id] = record
    return result
  }

  async search(query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query

    const allowedFields: (keyof IAttendance)[] = ['id', 'employeeId', 'checkInTime', 'isLate']

    const filter: any = { active: true }
    const selection: any = size === 'small' ? {} : { active: 0, _id: 0, __v: 0 }

    for (const field in queryFields) {
      if (!(allowedFields as any[]).includes(field.replace(/[~<>]/, ''))) {
        throw new AppErrorResponse({ statusCode: 403, name: `Campo no permitido: ${field}` })
      }

      const value = queryFields[field]
      const cleanField = field.replace(/[~<>]/, '')

      if (Array.isArray(value)) {
        filter[cleanField] = { $in: value }
      } else if (field.startsWith('~')) {
        filter[cleanField] = new RegExp('' + String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      } else if (field.startsWith('<')) {
        filter[cleanField] = { ...filter[cleanField], $lt: value }
      } else if (field.startsWith('>')) {
        filter[cleanField] = { ...filter[cleanField], $gt: value }
      } else {
        filter[cleanField] = value
      }
    }

    const records = await AttendanceModel.find(filter).select(selection).limit(limit).sort({ createdAt: 'desc' })
    if (records.length === 0) return []
    return this.reformatData(records)
  }

  async create(body: CreateAttendanceBody, session: ClientSession): Promise<CreateAttendanceResponse> {
    const { employeeId, checkInTime: checkInTimeBody, checkOutTime: checkOutTimeBody } = body;

    const checkInTime = moment(checkInTimeBody)
    const checkOutTime = checkOutTimeBody ? moment(checkOutTimeBody) : null

    const day = checkInTime.clone().format("YYYY-MM-DD")

    const employee = await EmployeeModel.findOne({
      $or: [
        { id: employeeId },
        { biometricId: employeeId }
      ],
      status: EEmployeStatus.ACTIVE,
      active: true
    });

    if (!employee) throw new AppErrorResponse({ statusCode: 404, name: `No se encontró el empleado ${employeeId}` })
    const employeeName = employee.fullname()

    const existingAttendance = await AttendanceModel.findOne({ active: true, employeeId: employee.id, checkInTime: { $regex: `^${day}` } });
    if (existingAttendance) throw new AppErrorResponse({ statusCode: 409, name: `Ya hay una asistencia para ${employeeName} el día ${day}` })

    const existingAbsence = await AbsenceModel.findOne({ active: true, employeeId: employee.id, date: { $regex: `^${day}` } });
    if (existingAbsence) throw new AppErrorResponse({ statusCode: 409, name: `Ya hay una ausencia para ${employeeName} el día ${day}` })

    const dayOfWeek = checkInTime.format("dddd").toLowerCase()
    const scheduleForDay = employee.schedule[dayOfWeek as keyof IEmployeSchedule];

    const scheduleException = await ScheduleExceptionModel.findOne({
      active: true,
      employeeId: employee.id,
      name: { $nin: this.notWorkableScheduleExceptions },
      $or: [
        {
          $and: [
            { startDate: { $regex: `^${day}` } },
            { allDay: true },
          ]
        },
        {
          $and: [
            { startDate: { $lte: day } },
            { endDate: { $gt: day } }
          ]
        }
      ]
    });

    console.log('checkInTime', checkInTime.format("YYYY-MM-DD HH:mm:SS"), 'dayOfWeek', dayOfWeek, 'scheduleForDay', scheduleForDay)
    console.log('checkOutTime', checkOutTime?.format("YYYY-MM-DD HH:mm:SS"))
    if ((!scheduleForDay || !scheduleForDay.start) && scheduleException == null) throw new AppErrorResponse({ statusCode: 400, name: `${employeeName} no trabaja el día ${day} (${this.daysTranslationMap[dayOfWeek]})` })

    const scheduleForDayStart = scheduleForDay?.start ?? Object.values(employee.schedule).find(x => x?.start != null).start
    const scheduleForDayEnd = scheduleForDay?.end ?? Object.values(employee.schedule).find(x => x?.end != null).end

    const scheduleStartTime = moment(`${day}T${scheduleForDayStart}:00`);
    const scheduleEndTime = moment(`${day}T${scheduleForDayEnd}:00`);
    const checkInDateTime = moment(checkInTimeBody);
    const delayMinutes = checkInDateTime.diff(scheduleStartTime, 'minutes');

    // Calcular overtime si se proporciona un tiempo de salida (checkOutTime)
    let overtimeMinutes = 0;
    if (checkOutTime) {
      overtimeMinutes = checkOutTime.diff(scheduleEndTime, 'minutes');
      overtimeMinutes = overtimeMinutes > 0 ? overtimeMinutes : 0;
    }

    const isLate = delayMinutes > this.MAX_TIME_DELAY;

    const id = 'AT' + String(await consumeSequence('attendances', session)).padStart(8, '0')
    const record = new AttendanceModel({
      id,
      employeeId: employee.id,
      employeeName,
      checkInTime: checkInTime.format("YYYY-MM-DD HH:mm:SS"),
      checkOutTime: checkOutTime?.format("YYYY-MM-DD HH:mm:SS"),
      date: day,
      isLate
    });
    customLog(`Creando asistencia ${String(record.id)} (${String(record.employeeId)}) el día ${day}`);
    await record.save({ session });

    if (employee.overtimeAllowed && (overtimeMinutes >= employee.minOvertimeMinutes) && (employee.minOvertimeMinutes > 0)) {
      try {
        await overtimeService.create({
          employeeId: employee.id,
          startTime: scheduleEndTime.format('YYYY-MM-DD HH:mm:ss'),
          hours: Math.floor(overtimeMinutes / 60)
        }, session)
      } catch (error) {
        console.error("error en create", error)
      }
    }


    return { id: record.id };
  }

  async createBulk(body: CreateAttendanceBody[] | CreateAttendanceBody, session: ClientSession): Promise<{ detail: any[] }> {
    const attendanceBodies = Array.isArray(body) ? body : [body]; // Convertir a array si no lo es
    let employeeIds = attendanceBodies.map(b => b.employeeId);
    const dates = attendanceBodies.map(body => moment(body.checkInTime).format("YYYY-MM-DD"));
    const uniqueDates = [...new Set(dates)];

    const employees = await EmployeeModel.find({
      $or: [
        { id: { $in: employeeIds } },
        { biometricId: { $in: employeeIds } }
      ],
      status: EEmployeStatus.ACTIVE,
      active: true
    }).select('id biometricId fullname schedule overtimeAllowed minOvertimeMinutes name lastName secondLastName active');

    employeeIds = employees.map(b => b.id);

    const attendances = await AttendanceModel.find({
      active: true,
      employeeId: { $in: employeeIds },
      date: { $in: uniqueDates }
    }).select('employeeId date active');

    const absences = await AbsenceModel.find({
      active: true,
      employeeId: { $in: employeeIds },
      date: { $in: uniqueDates }
    }).select('employeeId date active');

    const detail: any[] = [];
    const bulkOps = [];

    if (employees.length === 0) { detail.push(`No se encontraron empleados con los IDs proporcionados`); return { detail }; }

    for (const body of attendanceBodies) {
      const { employeeId, checkInTime: checkInTimeBody, checkOutTime: checkOutTimeBody } = body;
      const checkInTime = moment(checkInTimeBody);
      const checkOutTime = checkOutTimeBody ? moment(checkOutTimeBody) : null;
      const day = checkInTime.clone().format("YYYY-MM-DD");

      const employee = employees.find(e => e.id === employeeId || e.biometricId === employeeId);
      if (!employee) {
        detail.push({ error: `No se encontró el empleado con ID ${employeeId}`, payload: JSON.stringify(body) });
        customLog(`No se encontró el empleado con ID ${employeeId}`);
        continue;
      }
      const employeeName = employee.fullname();

      const existingAttendance = attendances.find(a => a.employeeId === employee.id && a.date === day);
      if (existingAttendance) {
        detail.push({ error: `Ya hay una asistencia para ${employeeName} el día ${day}`, payload: JSON.stringify(body) });
        customLog(`Ya hay una asistencia para ${employeeName} el día ${day}`);
        continue;
      }

      const existingAbsence = absences.find(a => a.employeeId === employee.id && a.date === day);
      if (existingAbsence) {
        detail.push({ error: `Ya hay una ausencia para ${employeeName} el día ${day}`, payload: JSON.stringify(body) });
        customLog(`Ya hay una ausencia para ${employeeName} el día ${day}`);
        continue;
      }

      const dayOfWeek = checkInTime.format("dddd").toLowerCase();
      const scheduleForDay = employee.schedule[dayOfWeek as keyof IEmployeSchedule];

      const scheduleForDayStart = scheduleForDay?.start ?? Object.values(employee.schedule).find(x => x?.start != null)?.start;
      const scheduleForDayEnd = scheduleForDay?.end ?? Object.values(employee.schedule).find(x => x?.end != null)?.end;
      console.log('checkInTime', checkInTime.format("YYYY-MM-DD HH:mm:SS"), 'dayOfWeek', dayOfWeek, 'scheduleForDay', scheduleForDay)
      console.log('checkOutTime', checkOutTime?.format("YYYY-MM-DD HH:mm:SS"))

      if (!scheduleForDayStart || !scheduleForDayEnd) {
        detail.push({ error: `${employeeName} no trabaja el día ${day} (${dayOfWeek})`, payload: JSON.stringify(body) });
        customLog(`${employeeName} no trabaja el día ${day} (${dayOfWeek})`);
        continue;
      }

      const scheduleStartTime = moment(`${day}T${scheduleForDayStart}:00`);
      const scheduleEndTime = moment(`${day}T${scheduleForDayEnd}:00`);
      const checkInDateTime = moment(checkInTimeBody);
      const delayMinutes = checkInDateTime.diff(scheduleStartTime, 'minutes');

      let overtimeMinutes = 0;
      if (checkOutTime) {
        overtimeMinutes = checkOutTime.diff(scheduleEndTime, 'minutes');
        overtimeMinutes = overtimeMinutes > 0 ? overtimeMinutes : 0;
      }

      const isLate = delayMinutes > this.MAX_TIME_DELAY;

      const id = 'AT' + String(await consumeSequence('attendances', session)).padStart(8, '0');

      if (checkOutTime !== null) {
        bulkOps.push({
          insertOne: {
            document: {
              id,
              employeeId: employee.id,
              employeeName,
              checkInTime: checkInTime.format("YYYY-MM-DD HH:mm:SS"),
              checkOutTime: checkOutTime.format("YYYY-MM-DD HH:mm:SS"),
              date: day,
              isLate
            }
          }
        });
      }

      detail.push({ id, success: true, payload: JSON.stringify(body) });

      // Crear overtime si aplica
      if (employee.overtimeAllowed && (overtimeMinutes >= employee.minOvertimeMinutes) && (employee.minOvertimeMinutes > 0)) {

        await overtimeService.create({
          employeeId: employee.id,
          startTime: scheduleEndTime.format('YYYY-MM-DD HH:mm:ss'),
          hours: Math.floor(overtimeMinutes / 60)
        }, session);
      }
    }

    // Realizar el bulkWrite solo si hay operaciones
    if (bulkOps.length > 0) {
      console.log("bulkOps", bulkOps)
      await AttendanceModel.bulkWrite(bulkOps, { session });
      console.log("ENDbulkOps")
    }

    return { detail };
  }

  async update(body: any, session: ClientSession): Promise<any> {
    const record = await AttendanceModel.findOne({ id: body.id })
    if (record == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró la asistencia' })

    const allowedFields: (keyof IAttendance)[] = [
      'isLate'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (record as any)[field] = body[field]
      }
    }

    await record.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return { id: record.id }
  }

  // -------------------------------------------------------------------------------------------------

  // TODO implemente bulk write
  async generateAutomaticDailyAttendances(body: any): Promise<any> {
    const date = body.date
    if (!date || !moment(date, true).isValid()) throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' });

    const day = moment(date).format('YYYY-MM-DD');

    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE, attendanceScheme: EEmployeeAttendanceScheme.AUTOMATIC });

    const detail: any[] = []

    for (const employee of employees) {
      const schedule = employee.schedule
      const dayOfWeek = moment(date).format("dddd").toLowerCase()
      const scheduleForDay = (schedule as any)?.[dayOfWeek];

      const attendance: CreateAttendanceBody = {
        employeeId: employee.id,
        checkInTime: day + ' ' + scheduleForDay.start + ':00',
        checkOutTime: day + ' ' + scheduleForDay.end + ':00'
      }

      let session = await AppMainMongooseRepo.startSession()
      session.startTransaction()
      try {
        const record = await this.create(attendance, session);
        detail.push({ result: record.id, payload: JSON.stringify(attendance) })
        await session.commitTransaction()
        await session.endSession()
      }
      catch (error: any) {
        console.log(error)
        await session.abortTransaction()
        detail.push({ error: error.name, payload: JSON.stringify(attendance) })
      }
    }

    customLog(detail)

    return {
      detail,
      errors: detail.filter((x: any) => x.error != null).length,
      success: detail.filter((x: any) => x.result != null).length
    }
  }

  async importFromCsv(file: Express.Multer.File | undefined, session: ClientSession) {
    if (typeof file === "undefined") throw new AppErrorResponse({ statusCode: 400, name: 'El archivo csv es requerido' });

    const csvRows = await readCsv(file);
    csvRows.sort((a, b) => a.time.localeCompare(b.time));
    csvRows.sort((a, b) => a.employeeId.localeCompare(b.employeeId));

    const employeeIds = csvRows.map((x) => x.employeeId);
    console.log(employeeIds)
    let detail: any = []

    // Obtener empleados activos y su horario
    const employees = await EmployeeModel.find({
      active: true,
      $or: [
        { id: { $in: employeeIds } },
        { biometricId: { $in: employeeIds } }
      ],
      status: EEmployeStatus.ACTIVE
    }).select({ id: true, biometricId: true, schedule: true, name: true, lastName: true });

    const MAX_TIME_BEFORE_SHIFT_START = 119; // minutos antes del turno
    const MIN_TIME_AFTER_CHECKIN = 60;
    const MAX_TIME_TO_CLOSE_ATTENDANCE = 1320;

    const attendances: CreateAttendanceBody[] | any[] = [];
    const tempCheckinsMap: { [key: string]: { index: number, employeeId: string, checkInTime: string } } = {};

    for (const [index, row] of csvRows.entries()) {
      const { employeeId, time } = row;
      const dayOfWeek = moment(time).format("dddd").toLowerCase(); // se obtiene el nombre del día que coincide con el schedule del empleado

      const employee = employees.find((x) => x.biometricId === String(employeeId) || x.id === String(employeeId))

      if (typeof employee === "undefined") {
        detail.push({ row: index + 2, skipped: 'No se encontró el empleado', payload: JSON.stringify(row) });
        continue;
      }

      const schedule = employee?.schedule[dayOfWeek as keyof IEmployeSchedule];
      if (!schedule || !schedule.start) {
        detail.push({ row: index + 2, skipped: 'No se encontró el horario para ese dia', payload: JSON.stringify(row) });
        continue;
      };

      const currentDayCheckin = tempCheckinsMap[employeeId]
      const hasCheckinToday = currentDayCheckin != null

      const checkTime = moment(time)
      const shiftStartTime = checkTime.clone().set({
        hour: Number(schedule.start.split(":")[0]),
        minute: Number(schedule.start.split(":")[1]),
        second: 0
      });

      const isBeforeShiftStart = moment(checkTime).isBefore(shiftStartTime.clone().subtract(MAX_TIME_BEFORE_SHIFT_START, 'minutes'));
      if (isBeforeShiftStart) {
        // Si no hay una asistencia abierta, ignorar linea
        if (!currentDayCheckin) { detail.push({ row: index + 2, skipped: 'Se registró asistencia demasiado antes de la hora de entrada', payload: JSON.stringify(row) }); continue }
        // Si hay una asistencia sin cerrar, cerrarla
        attendances.push({ ...currentDayCheckin, checkOutTime: checkTime.format("YYYY-MM-DD HH:mm:ss") })
        delete tempCheckinsMap[employeeId]
        continue;
      }

      //Si no hay checkin ese dia, se registra
      if (!hasCheckinToday) {
        tempCheckinsMap[employeeId] = { index, employeeId, checkInTime: checkTime.format("YYYY-MM-DD HH:mm:ss") };
        continue
      }

      // Si ya hay checkin ese dia, se calcula el checkout
      if (hasCheckinToday) {
        const checkInTime = moment(tempCheckinsMap[employeeId].checkInTime)
        const timeDiffInMinutes = calculateMinuteDifference(checkTime, checkInTime) // calcula la diferencia en minutos de dos instancias moment
        const canCheckout = timeDiffInMinutes >= MIN_TIME_AFTER_CHECKIN;
        console.log('checkinTime', checkInTime, 'checkTime', checkTime, 'canCheckout', canCheckout)

        // Ignorar linea si el checkout es demasiado pronto
        if (!canCheckout) {
          detail.push({ row: index + 2, skipped: 'Se intentó hacer checkout demasiado pronto', payload: JSON.stringify(row) });
          continue
        }

        const shiftStartTime2 = moment(currentDayCheckin.checkInTime).clone().set({
          hour: Number(schedule.start.split(":")[0]),
          minute: Number(schedule.start.split(":")[1]),
          second: 0
        });
        const timeAfterShiftStart = moment(checkTime).diff(shiftStartTime2, 'minutes');
        console.log(employee.fullname(), 'shiftStartTime', shiftStartTime2, 'timeAfterShiftStart', timeAfterShiftStart)
        // Si pasó el tiempo limite para checkout, se crea la asistencia sin checkout
        if (timeAfterShiftStart > MAX_TIME_TO_CLOSE_ATTENDANCE) { // si no sirve regresar timeAfterShiftStart a timeDiffInMinutes
          attendances.push({ ...tempCheckinsMap[employeeId], checkOutTime: undefined });
          tempCheckinsMap[employeeId] = { index, employeeId, checkInTime: checkTime.format("YYYY-MM-DD HH:mm:ss") };
          continue
        }
        // Se marca checkout y se crea la asistencia
        attendances.push({ ...tempCheckinsMap[employeeId], checkOutTime: checkTime.format("YYYY-MM-DD HH:mm:ss") })
        delete tempCheckinsMap[employeeId];
      }
    }

    for (const [, checkin] of Object.entries(tempCheckinsMap)) {
      attendances.push({ ...checkin, checkOutTime: undefined });
    }

    let result: any = {}
    result = await this.createBulk(attendances, session);
    detail = detail.concat(result?.detail ?? [])

    return {
      totalRows: csvRows.length,
      detail,
      errors: detail.filter((x: any) => x.error != null).length,
      skipped: detail.filter((x: any) => x.skipped != null).length,
      createdAttendances: detail.filter((x: any) => x.success == true).length
    }
  }

  reformatData(array: IAttendance[]): any[] {
    const newArray = array.map((record => {
      const result: any = {
        ...JSON.parse(JSON.stringify(record)),
        date: record.checkInTime,
        title: record.isLate ? 'Retardo' : 'Asistencia'
      }
      return result
    }))
    return newArray
  }

}

const attendanceService: AttendanceService = new AttendanceService()
export default attendanceService
