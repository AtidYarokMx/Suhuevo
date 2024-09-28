
import { EEmployeStatus } from '@app/dtos/employee.dto'
import { IOvertime } from '@app/dtos/overtime.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { EmployeeModel } from '@app/repositories/mongoose/models/employee.model'
import { OvertimeModel } from '@app/repositories/mongoose/models/overtime.model'
import { consumeSequence } from '@app/utils/sequence'
import { customLog } from '@app/utils/util.util'
import moment from 'moment'
import { type ClientSession } from 'mongoose'


class OvertimeService {
  async get (query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids]
    const records = await OvertimeModel.find({ active: true, id: { $in: ids } })

    const result: any = {}
    for (const record of records) result[record.id] = record
    return result
  }

  async search (query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query

    const allowedFields: (keyof IOvertime)[] = ['id', 'startTime', 'employeeId', 'employeeName', 'hours']

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

    const records = await OvertimeModel.find(filter).select(selection).limit(limit).sort({ createdAt: 'desc' })
    if (records.length === 0) return []
    return records
  }

  async create (body: any, session: ClientSession): Promise<any> {
    let { employeeId, startTime, hours, status } = body;

    startTime = moment(startTime);
    const formattedStartTime = startTime.format('YYYY-MM-DD HH:mm:ss')
    if (!startTime.isValid()) throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' })

    const employee = await EmployeeModel.findOne({ id: employeeId, status: EEmployeStatus.ACTIVE});
    if (!employee) throw new AppErrorResponse({ statusCode: 404, name: `No se encontró el empleado ${employeeId}` })

    const existingOvertime = await OvertimeModel.findOne({ active: true, employeeId: employee.id, startTime: formattedStartTime})
    if (existingOvertime != null)  throw new AppErrorResponse({ statusCode: 409, name: `Ya hay un tiempo extra de ${employeeId} en la fecha ${startTime}` })

    const id = 'OT' + String(await consumeSequence('overtimes', session)).padStart(8, '0')
    const record = new OvertimeModel({
      id,
      startTime: formattedStartTime,
      hours,
      status,

      employeeId: employee.id,
      employeeName: employee.fullname()
    })
    customLog(`Creando tiempo extra ${String(record.id)} (${String(record.employeeName)})`)
    await record.save({ session })

    return { id: record.id }
  }

  async update (body: any, session: ClientSession): Promise<any> {
  //   const record = await OvertimeModel.findOne({ id: body.id })
  //   if (record == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el tiempo extra' })

  //   const allowedFields: (keyof IOvertime)[] = [
  //     'name',
  //     'departmentId'
  //   ]

  //   for (const field of allowedFields) {
  //     if (body[field] !== undefined) {
  //       (record as any)[field] = body[field]
  //     }
  //   }

  //   await record.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
  //   return { id: record.id }
  }
}

const overtimeService: OvertimeService = new OvertimeService()
export default overtimeService
