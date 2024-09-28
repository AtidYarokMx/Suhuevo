/* lib */
import moment from 'moment'
/* repos & clients */
import { type ClientSession } from 'mongoose'
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* dtos */
import { CreateAttendanceBody, CreateAttendanceResponse, IAttendance } from '@app/dtos/attendance.dto'
import { EEmployeStatus, IEmployeSchedule } from '@app/dtos/employee.dto'
/* models */
import { ScheduleExceptionModel } from '@app/repositories/mongoose/models/schedule-exception.model'
import { AttendanceModel } from '@app/repositories/mongoose/models/attendance.model'
import { EmployeeModel } from '@app/repositories/mongoose/models/employee.model'
import { AbsenceModel } from '@app/repositories/mongoose/models/absence.model'
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { consumeSequence } from '@app/utils/sequence'
import { arrayToObject, customLog } from '@app/utils/util.util'
import { parse as parseDate } from '@app/utils/date.util';
import { readCsv } from '@app/utils/file.util';
import overtimeService from './overtime.service'

class AttendanceService {
  private readonly MAX_TIME_DELAY = 10;
  private readonly notWorkableScheduleExceptions = ['Permiso', 'Vaciones']
  private readonly daysTranslationMap: { [key: string]: string } = { 'monday': 'lunes', 'tuesday': 'martes', 'wednesday': 'miércoles', 'thursday': 'jueves', 'friday': 'viernes', 'saturday': 'sábado', 'sunday': 'domingo' };
  private readonly MIN_OVERTIME_MINUTES = 60;

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
      status: EEmployeStatus.ACTIVE
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

    console.log('delayMinutes', delayMinutes);
    console.log('overtimeMinutes:', overtimeMinutes); 

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

    if (overtimeMinutes >= this.MIN_OVERTIME_MINUTES) {
      try {
        await overtimeService.create({
          employeeId: employee.id,
          startTime: scheduleEndTime.format('YYYY-MM-DD HH:mm:ss'),
          hours: overtimeMinutes / 60
        }, session)
      } catch (error) {}
    }


    return { id: record.id };
  }

  // async createMany(body: CreateAttendanceBody[] | CreateAttendanceBody) {
  //   if (!Array.isArray(body)) body = [body]
  //   const attendancesFromBody = body

  //   const employeeIds = attendancesFromBody.map((x) => x.employeeId)
  //   const employees = await EmployeeModel.find({
  //     active: true,
  //     $or: [
  //       { id: { $in: employeeIds } },
  //       { biometricId: { $in: employeeIds } }
  //     ],
  //     status: EEmployeStatus.ACTIVE
  //   });
  //   const employeesMap = arrayToObject(employees, 'id')

  //   const uniqueDays = [...new Set(attendancesFromBody.map((x) => x.checkInTime))];
  //   const existingAttendances = await AttendanceModel.find({ active: true, employeeId: { $in: employeeIds }, date: { $in: uniqueDays } })
  //   const existingAbsences = await AbsenceModel.find({ active: true, employeeId: { $in: employeeIds }, date: { $in: uniqueDays } })
  //   // const scheduleException = await ScheduleExceptionModel.findOne({
  //   //   active: true,
  //   //   employeeId: { $in: employeeIds },
  //   //   name: { $nin: this.notWorkableScheduleExceptions },
  //   //   $or: [
  //   //     {
  //   //       $and: [
  //   //         { startDate: { $regex: `^(${uniqueDays.join('|')})` } },
  //   //         { allDay: true },
  //   //       ]
  //   //     },
  //   //     {
  //   //       $and: [
  //   //         { startDate: { $lte: day } },
  //   //         { endDate: { $gt: day } }
  //   //       ]
  //   //     }
  //   //   ]
  //   // });

  // }

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

  // async startCalculations(session: ClientSession) {
  //   const startDate = moment("9/11/2024 00:00:00", "M/D/YYYY H:m:s")
  //   const endDate = moment("9/17/2024 23:59:59", "M/D/YYYY H:m:s")

  //   const attendances = await AttendanceModel.aggregate<IAttendance & {
  //     checkInDate: Date
  //     checkOutDate: Date
  //   }>([
  //     {
  //       $addFields: {
  //         checkInDate: {
  //           $dateFromString: {
  //             dateString: "$checkInTime", // Convertir checkInTime de string a Date
  //             format: "%Y-%m-%d %H:%M:%S" // Asegúrate de usar el formato adecuado que coincide con el almacenado en la DB
  //           }
  //         },
  //         checkOutDate: {
  //           $dateFromString: {
  //             dateString: "$checkOutTime", // Convertir checkInTime de string a Date
  //             format: "%Y-%m-%d %H:%M:%S" // Asegúrate de usar el formato adecuado que coincide con el almacenado en la DB
  //           }
  //         },
  //       }
  //     },
  //     {
  //       $match: {
  //         checkInDate: {
  //           $gte: startDate.toDate(),
  //           $lte: endDate.toDate()
  //         }
  //       }
  //     }
  //   ])

  //   for await (const attendance of attendances) {
  //     if (attendance.checkOutDate == null) {
  //       const idSequence = await consumeSequence("absences", session)
  //       const id = String(idSequence).padStart(8, '0')
  //       await AbsenceModel.create({
  //         id,
  //         employeeId: attendance.employeeId,
  //         employeeName: attendance.employeeName,
  //         date: attendance.checkInDate,
  //         isJustified: false,
  //         reason: "No se hizo el check out",
  //         isPaid: false,
  //       })
  //     }
  //   }

  //   // await Promise.all([
  //   //   attendances.forEach(async (attendance) => {

  //   //   })
  //   // ])

  //   // console.log(attendances)

  //   return null
  // }

  async importFromCsv(file: any) {
    if (file == null) throw new AppErrorResponse({ statusCode: 400, name: 'El archivo csv es requerido' });

    const csvRows: { employeeId: string, time: string }[] = await readCsv(file);
    const employeeIds = csvRows.map((x) => x.employeeId);
    let detail: any = []
    
    // Obtener empleados activos y su horario
    const employees = await EmployeeModel.find({
      active: true,
      $or: [
        { id: { $in: employeeIds } },
        { biometricId: { $in: employeeIds } }
      ],
      status: EEmployeStatus.ACTIVE
    }).select({ id: 1, biometricId: 1, schedule: 1 });
  
    const MAX_TIME_BEFORE_SHIFT_START = 30; // minutos antes del turno
    const MIN_TIME_AFTER_CHECKIN = 60;
    const MAX_TIME_TO_CLOSE_ATTENDANCE = 1380;
  
    const attendances: CreateAttendanceBody[] | any [] = [];
    const tempCheckinsMap: { [key: string]: { index: number, employeeId: string, checkInTime: string} } = {}; 
  
    for (const [index, row] of csvRows.entries()) {
      const { employeeId, time } = row;
      const dayOfWeek = moment(time).format("dddd").toLowerCase(); 

      const employee = employees.find((x) => x.id === String(employeeId) || x.biometricId === String(employeeId))
      if (!employee) { detail.push({ row: index + 2, skipped: 'No se encontró el empleado', payload: JSON.stringify(row) }); continue }

      const schedule = employee?.schedule[dayOfWeek as keyof IEmployeSchedule];
      if (!schedule || !schedule.start) { detail.push({ row: index + 2, skipped: 'No se encontró el horario para ese dia', payload: JSON.stringify(row) }); continue };
  
      const checkTime = moment(time)
      const shiftStartTime = checkTime.clone().set({
        hour: Number(schedule.start.split(":")[0]),
        minute: Number(schedule.start.split(":")[1]),
        second: 0
      });
  
      const isBeforeShiftStart = moment(checkTime).isBefore(shiftStartTime.clone().subtract(MAX_TIME_BEFORE_SHIFT_START, 'minutes'));

      if (isBeforeShiftStart) {
        const lastAttendance = tempCheckinsMap[employeeId];
        // Si no hay una asistencia abierta, ignorar linea
        if (!lastAttendance) { detail.push({ row: index + 2, skipped: 'Se registró asistencia demasiado antes de la hora de entrada', payload: JSON.stringify(row) }); continue }
        // Si hay una asistencia sin cerrar, cerrarla
        attendances.push({ ...lastAttendance, checkOutTime: checkTime.format("YYYY-MM-DD HH:mm:ss") })
        delete tempCheckinsMap[employeeId]
        continue;
      }

      if (!tempCheckinsMap[employeeId]) {
        // No hay asistencia temporal, crear nueva
        tempCheckinsMap[employeeId] = { index, employeeId, checkInTime: checkTime.format("YYYY-MM-DD HH:mm:ss") };
      } else { 
        const checkInTime = moment(tempCheckinsMap[employeeId].checkInTime)
        const timeDiffInMinutes = moment(checkTime).diff(checkInTime, 'minutes');
        const canCheckout = timeDiffInMinutes >= MIN_TIME_AFTER_CHECKIN;
        console.log('checkinTime', checkInTime, 'checkTime', checkTime, 'canCheckout', canCheckout)

        // Ignorar linea si es un checkout demasiado pronto
        if (!canCheckout) { 
          detail.push({ row: index + 2, skipped: 'Se intentó hacer checkout demasiado pronto', payload: JSON.stringify(row) });
          continue
        }

        if (timeDiffInMinutes > MAX_TIME_TO_CLOSE_ATTENDANCE) {
          attendances.push({ ...tempCheckinsMap[employeeId], checkOutTime: undefined });
          tempCheckinsMap[employeeId] = { index, employeeId, checkInTime: checkTime.format("YYYY-MM-DD HH:mm:ss") };
          continue
        }      
        // Si existe una asistencia temporal, cerrarla
        attendances.push({ ...tempCheckinsMap[employeeId], checkOutTime: checkTime.format("YYYY-MM-DD HH:mm:ss") })
        delete tempCheckinsMap[employeeId];
      }
    }
  
    for (const row of attendances) {
      let session = await AppMongooseRepo.startSession()
      session.startTransaction()
      try {
        const attendance = await this.create(row, session);
        detail.push({ row: row.index + 2, result: attendance.id, payload: JSON.stringify(row) })
        await session.commitTransaction()
        await session.endSession()
      }
      catch (error: any) {
        console.log(error)
        await session.abortTransaction()
        detail.push({ row: row.index + 2, error: error.name, payload: JSON.stringify(row) })
      }
    }
    // console.log(JSON.stringify({ totalRows: attendances.length, detail, createdAttendances }, null, 4))
    return {
      totalRows: csvRows.length,
      detail,
      errors: detail.filter((x: any) => x.error != null).length,
      skipped: detail.filter((x: any) => x.skipped != null).length,
      createdAttendances: detail.filter((x: any) => x.result != null).length
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
