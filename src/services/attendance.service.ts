
import { IAttendance } from '@app/dtos/attendance.dto'
import { EEmployeStatus } from '@app/dtos/employee.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { AttendanceModel } from '@app/repositories/mongoose/models/attendance.model'
import { EmployeeModel } from '@app/repositories/mongoose/models/employee.model'
import { consumeSequence } from '@app/utils/sequence'
import { customLog } from '@app/utils/util.util'
import { type ClientSession } from 'mongoose'
import csvParser from 'csv-parser';
import fs from 'fs';


class AttendanceService {
  private readonly MAX_TIME_DELAY = 10;

  async get (query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids]
    const records = await AttendanceModel.find({ active: true, id: { $in: ids } })

    const result: any = {}
    for (const record of records) result[record.id] = record
    return result
  }

  async search (query: any): Promise<any> {
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
    return records
  }

  async create (body: any, session: ClientSession): Promise<any> {
    let { employeeId, checkInTime } = body;
    checkInTime = new Date(checkInTime).toISOString()

    const employee = await EmployeeModel.findOne({ id: employeeId, status: EEmployeStatus.ACTIVE });
    if (!employee) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el empleado' })
    const employeeName = `${employee.name} ${employee.lastName ?? ''} ${employee.secondLastName ?? ''}`

    const checkInDate = new Date(checkInTime).toISOString().slice(0, 10); // YYYY-MM-DD
    console.log('checkInDate', checkInDate)
    const existingAttendance = await AttendanceModel.findOne({ active: true, employeeId, checkInTime: { $regex: `^${checkInDate}` } });
    if (existingAttendance) throw new AppErrorResponse({ statusCode: 409, name: `Ya hay una asistencia para ${employeeName} el día ${checkInDate}` })
  
    const dayOfWeek = new Date(checkInTime).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const scheduleForDay = (employee.schedule as any)?.[dayOfWeek];
    if (!scheduleForDay) throw new AppErrorResponse({ statusCode: 400, name: 'No se encontró horario laboral' })
  
    const scheduleStartTime = new Date(checkInDate + 'T' + scheduleForDay.start + ':00');
    const checkInDateTime = new Date(checkInTime);
    const differenceInMinutes = (checkInDateTime.getTime() - scheduleStartTime.getTime()) / 60_000;

    console.log(scheduleStartTime, checkInDateTime)
    console.log(checkInDateTime.getTime(), scheduleStartTime.getTime(), checkInDateTime.getTime() - scheduleStartTime.getTime())
    console.log('differenceInMinutes', differenceInMinutes)

    const isLate = differenceInMinutes > this.MAX_TIME_DELAY;
  
    const id = String(await consumeSequence('attendances', session)).padStart(8, '0')
    const record = new AttendanceModel({ id, employeeId, employeeName, checkInTime, isLate });
  
    customLog(`Creando asistencia ${String(record.id)} (${String(record.employeeId)})`);
    await record.save({ session });
  
    return { id: record.id };
  }

  async update (body: any, session: ClientSession): Promise<any> {
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

  async importFromCsv(file: any, session: ClientSession) {
    if (file == null)  throw new AppErrorResponse({ statusCode: 400, name: 'No se encontró un archivo csv' })

    const rows: any[] = [];

    // Convertir el archivo CSV a un array
    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(file.path)
        .pipe(csvParser())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    // console.log('rows', rows)

    const reformattedRows = rows.map(row => {
      return {
        employeeId: row['Person ID'],
        checkInTime: row['Time']
      }
    })

    // Procesar el array de manera secuencial usando for...of
    for (const row of reformattedRows) {
      await this.create(row, session);
    }
  }

}

const attendanceService: AttendanceService = new AttendanceService()
export default attendanceService
