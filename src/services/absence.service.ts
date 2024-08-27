import { IAbsence } from "@app/dtos/absence.dto";
import { EEmployeStatus } from "@app/dtos/employee.dto";
import { AppErrorResponse } from "@app/models/app.response";
import { AppMongooseRepo } from "@app/repositories/mongoose";
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import { ScheduleExceptionModel } from "@app/repositories/mongoose/models/schedule-exception.model";
import { consumeSequence } from "@app/utils/sequence";
import { customLog } from "@app/utils/util.util";
import { ClientSession } from "mongoose";

class AbsenceService {

  async get (query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids]
    const records = await AbsenceModel.find({ active: true, id: { $in: ids } })

    const result: any = {}
    for (const record of records) result[record.id] = record
    return result
  }

  async search (query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query

    const allowedFields: (keyof IAbsence)[] = ['id', 'employeeId', 'employeeName', 'date']

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

    const records = await AbsenceModel.find(filter).select(selection).limit(limit).sort({ createdAt: 'desc' })
    if (records.length === 0) return []
    return records
  }

  async generateDailyAbsences (body: any, session: ClientSession): Promise<any> {
    const date = body.date
    if (date == null || isNaN(new Date(date).getTime())) throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' });

    const stringDate = new Date(date).toISOString().slice(0,10)

    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE });
    const attendances = await AttendanceModel.find({ active: true, checkInTime: { $regex: `^${stringDate}`}})
    const absences = await AbsenceModel.find({ active: true, date: stringDate })
    const scheduleExceptions = await ScheduleExceptionModel.find({
      active: true,
      $or: [
        {
          $and: [
            { startDate: { $regex: `^${stringDate}` } },
            { allDay: true },
          ]
        },
        {
          $and: [
            { startDate: { $lte: stringDate } },
            { endDate: { $gt: stringDate } }
          ]
        }
        
      ]
    });
    
    let newAbsencesCount = 0;

    for (const employee of employees) {
      const employeeName = `${employee.name} ${employee.lastName ?? ''} ${employee.secondLastName ?? ''}`
      const schedule = employee.schedule

      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const scheduleForDay = (schedule as any)?.[dayOfWeek];

      console.log(employeeName)
      if (!scheduleForDay) { console.log('Dia no laboral'); continue }

      const attendance = attendances.find(x => x.employeeId === employee.id)
      if (attendance) { console.log('Asistió'); continue }

      const scheduleException = scheduleExceptions.find(x => x.employeeId === employee.id)
      if (scheduleException) { console.log(`Cambio de horario (${scheduleException.reason})`); continue }

      const absence = absences.find(x => x.employeeId === employee.id)
      if (absence) { console.log('Ya se registró una ausencia hoy'); continue }

      const id = String(await consumeSequence('absences', session)).padStart(8, '0')
      const record = new AbsenceModel({ id, employeeId: employee.id, employeeName, date: stringDate })
      customLog(`Creando ausencia ${String(record.id)} (${employee.name} ${employee.lastName})`)
      await record.save({ session })

      newAbsencesCount++;
    }

    const totalAbsences = absences.length + newAbsencesCount;
    return { totalAbsences, newAbsences: newAbsencesCount };
  }
}

const absenceService: AbsenceService = new AbsenceService()
export default absenceService
