/* lib */
import fs from 'fs';
import csvParser from 'csv-parser';
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
import { customLog } from '@app/utils/util.util'
import { parse as parseDate } from '@app/utils/date.util';
import { readCsv } from '@app/utils/file.util';

class AttendanceService {
  private readonly MAX_TIME_DELAY = 10;
  private readonly notWorkableScheduleExceptions = ['Permiso', 'Vaciones']

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
    const { employeeId, checkInTime: checkInTimeBody } = body;
    /* solución de formateado de fecha */
    const parsedCheckInTime = parseDate(checkInTimeBody)
    const desiredCheckInTime = parsedCheckInTime.format("YYYY-MM-DD") // Asignar el formato deseado

    const checkInTime = new Date(checkInTimeBody).toISOString()
    console.log(parsedCheckInTime, checkInTime)

    const employee = await EmployeeModel.findOne({
      $or: [
        { id: employeeId },
        { biometricId: employeeId }
      ],
      status: EEmployeStatus.ACTIVE
    });

    if (!employee) throw new AppErrorResponse({ statusCode: 404, name: `No se encontró el empleado ${employeeId}` })
    const employeeName = employee.fullname()

    const checkInDate = desiredCheckInTime
    console.log('checkInDate', checkInDate)
    const existingAttendance = await AttendanceModel.findOne({ active: true, employeeId: employee.id, checkInTime: { $regex: `^${checkInDate}` } });
    if (existingAttendance) throw new AppErrorResponse({ statusCode: 409, name: `Ya hay una asistencia para ${employeeName} el día ${checkInDate}` })

    const existingAbsence = await AbsenceModel.findOne({ active: true, employeeId: employee.id, date: { $regex: `^${checkInDate}` } });
    if (existingAbsence) throw new AppErrorResponse({ statusCode: 409, name: `Ya hay una ausencia para ${employeeName} el día ${checkInDate}` })

    const dayOfWeek = parsedCheckInTime.format("dddd").toLowerCase()
    const scheduleForDay = employee.schedule[dayOfWeek as keyof IEmployeSchedule];

    const scheduleException = await ScheduleExceptionModel.findOne({
      active: true,
      employeeId: employee.id,
      name: { $nin: this.notWorkableScheduleExceptions },
      $or: [
        {
          $and: [
            { startDate: { $regex: `^${checkInDate}` } },
            { allDay: true },
          ]
        },
        {
          $and: [
            { startDate: { $lte: checkInDate } },
            { endDate: { $gt: checkInDate } }
          ]
        }

      ]
    });

    if (!scheduleForDay && scheduleException == null) throw new AppErrorResponse({ statusCode: 400, name: `${employeeName} no trabaja el día ${checkInDate}` })

    const scheduleForDayStart = scheduleForDay?.start ?? Object.values(employee.schedule).find(x => x?.start != null).start
    const scheduleStartTime = new Date(checkInDate + 'T' + scheduleForDayStart + ':00');
    const checkInDateTime = new Date(checkInTime);
    const differenceInMinutes = (checkInDateTime.getTime() - scheduleStartTime.getTime()) / 60_000;

    console.log(scheduleStartTime, checkInDateTime)
    console.log(checkInDateTime.getTime(), scheduleStartTime.getTime(), checkInDateTime.getTime() - scheduleStartTime.getTime())
    console.log('differenceInMinutes', differenceInMinutes)

    const isLate = differenceInMinutes > this.MAX_TIME_DELAY;

    const id = 'AT' + String(await consumeSequence('attendances', session)).padStart(8, '0')
    const record = new AttendanceModel({ id, employeeId: employee.id, employeeName, checkInTime, isLate });

    customLog(`Creando asistencia ${String(record.id)} (${String(record.employeeId)}) el día ${desiredCheckInTime}`);
    await record.save({ session });

    return { id: record.id };
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

  async importFromCsv(file: any) {
    if (file == null) throw new AppErrorResponse({ statusCode: 400, name: 'El archivo csv es requerido' })

    const reformattedRows = await readCsv(file)

    let detail: any = []
    let createdAttendances = 0

    for (const [index, row] of reformattedRows.entries()) {
      let session = await AppMongooseRepo.startSession()
      session.startTransaction()
      try {
        const attendance = await this.create(row, session);
        detail.push({ row: index + 1, result: attendance.id })
        createdAttendances++
        await session.commitTransaction()
        await session.endSession()
      }
      catch (error: any) {
        await session.abortTransaction()
        detail.push({ row: index + 1, error: error.name })
      }
    }

    return { totalRows: reformattedRows.length, detail, createdAttendances }

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
