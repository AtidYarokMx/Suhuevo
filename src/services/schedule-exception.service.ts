import { IScheduleException } from '@app/dtos/schedule-exception.dto'
import { AppErrorResponse } from '@app/models/app.response'
import { ScheduleExceptionModel } from '@app/repositories/mongoose/models/schedule-exception.model'
import { consumeSequence } from '@app/utils/sequence'
import { customLog } from '@app/utils/util.util'
import { type ClientSession } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'


class ScheduleExceptionService {
  async get (query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids]
    const records = await ScheduleExceptionModel.find({ active: true, id: { $in: ids } })

    const result: any = {}
    for (const record of records) result[record.id] = record
    return result
  }

  async search (query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query

    const allowedFields: (keyof IScheduleException)[] = ['id', 'employeeNumber', 'employeeId', 'approved', 'startDate', 'endDate']

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

    const records = await ScheduleExceptionModel.find(filter).select(selection).limit(limit).sort({ createdAt: 'desc' })
    if (records.length === 0) return [] 
    return this.reformatData(records)
  }

  async create (body: any, session: ClientSession): Promise<any> {
    const id = String(await consumeSequence('schedule-exceptions', session)).padStart(8, '0')

    const record = new ScheduleExceptionModel({ ...body, id })
    customLog(`Creando evento ${String(record.id)} (${String(record.name)})`)
    await record.save({ session })

    return { id: record.id }
  }

  async update (body: any, session: ClientSession): Promise<any> {
    const record = await ScheduleExceptionModel.findOne({ id: body.id })
    if (record == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el registro' })

    const allowedFields: (keyof IScheduleException)[] = [
      'name',
      'approved',
      'reason',
      'startDate',
      'endDate',
      'allDay'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (record as any)[field] = body[field]
      }
    }

    customLog(`Actualizando evento ${String(record.id)} (${String(record.name)})`)
    await record.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return { id: record.id }
  }

  async delete(body: any, session: ClientSession): Promise<any> {
    const id = body.id

    const record = await ScheduleExceptionModel.findOne({ active: true, id })
    if (record == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el registro' })

    customLog(`Eliminando evento ${String(record.id)} (${String(record.name)})`)

    record.active = false
    await record.save({ session })
  }

  async updateByEmployee(body: any, session: ClientSession): Promise<any> {
    console.log(body)
    const employeeId = body.employeeId
    const bodyEvents = JSON.parse(body.events)

    const storedEvents = await ScheduleExceptionModel.find({ active: true, employeeId })

    const bodyEventsIds = new Set(bodyEvents.map((event: any) => event.id));
    const storedEventIds = new Set(storedEvents.map((event: any) => event.id));

    // Filtrar eventos nuevos
    const toCreateEvents = bodyEvents.filter((event: any) => !storedEventIds.has(event.id));
    // Filtrar eventos eliminados
    const toDeleteEvents = storedEvents.filter((event: any) => !bodyEventsIds.has(event.id));
    // Filtrar eventos que necesitan actualización
    const toUpdateEvents = bodyEvents.filter((event: any) => storedEventIds.has(event.id));

    // console.log(newEvents, deleteEvents)

    for (const event of toCreateEvents) {
      await this.create({
        employeeId,
        name: event.title,
        startDate: event.start,
        endDate: event.end,
        allDay: event.allDay ?? false
      }, session)
    }

    for (const event of toUpdateEvents) {
      await this.update({ 
          id: event.id,
          startDate: event.start,
          endDate: event.end,
          allDay: event.allDay ?? false
      }, session);
  }


    for (const event of toDeleteEvents) {
      await this.delete({ id: event.id }, session)
    }

    return 'Success'
  }

  reformatData(array: IScheduleException[]): any[] {
    const newArray = array.map((record => {
      const result: any = {
        id: record.id,
        title: record.name,
        start: record.startDate,
        end: record.endDate,
        allDay: record.allDay,
      }
      if (record.allDay) result.groupId = 'allDay'
      
      return result
    }))
    // console.log('n', newArray)
    return newArray
  }


}

const scheduleExceptionService: ScheduleExceptionService = new ScheduleExceptionService()
export default scheduleExceptionService
