import { IAbsence } from "@app/dtos/absence.dto";
import { IAttendance } from "@app/dtos/attendance.dto";
import { EEmployeStatus } from "@app/dtos/employee.dto";
import { AppErrorResponse } from "@app/models/app.response";
import { AppMongooseRepo } from "@app/repositories/mongoose";
import { AbsenceModel } from "@app/repositories/mongoose/models/absence.model";
import { AttendanceModel } from "@app/repositories/mongoose/models/attendance.model";
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import { ScheduleExceptionModel } from "@app/repositories/mongoose/models/schedule-exception.model";
import { consumeSequence } from "@app/utils/sequence";
import { customLog } from "@app/utils/util.util";
import moment from "moment";
import { ClientSession } from "mongoose";

class AbsenceService {

  private readonly notWorkableScheduleExceptions = ['Permiso', 'Vaciones']

  async get (query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids]
    const records = await AbsenceModel.find({ active: true, id: { $in: ids } })

    const result: any = {}
    for (const record of records) result[record.id] = record
    return result
  }

  async search (query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query

    const allowedFields: (keyof IAbsence)[] = ['id', 'employeeId', 'employeeName', 'date', 'isJustified', 'reason']

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
    return this.reformatData(records)
  }

  async update (body: any, session: ClientSession): Promise<any> {
    console.log(body)
    const record = await AbsenceModel.findOne({ active: true, id: body.id })
    if (record == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró la falta' })

    const allowedFields: (keyof IAbsence)[] = [
      'isJustified',
      'reason'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (record as any)[field] = body[field]
      }
    }

    await record.save({ validateBeforeSave: true, validateModifiedOnly: true, session })
    return { id: record.id }
  }

  async generateDailyAbsences (body: any, session: ClientSession): Promise<any> {
    const date = body.date
    if (!date || !moment(date, true).isValid()) throw new AppErrorResponse({ statusCode: 400, name: 'Fecha inválida' });

    const day = moment(date).format('YYYY-MM-DD');

    const employees = await EmployeeModel.find({ active: true, status: EEmployeStatus.ACTIVE });
    const attendances: IAttendance[] = await AttendanceModel.find({ active: true, checkInTime: { $regex: `^${day}`}})
    const absences = await AbsenceModel.find({ active: true, date: day })
    const scheduleExceptions = await ScheduleExceptionModel.find({
      active: true,
      name: { $in: this.notWorkableScheduleExceptions },
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
    
    let newAbsencesCount = 0;
    const detail: string[] = []

    for (const employee of employees) {
      const employeeName = `${employee.name} ${employee.lastName ?? ''} ${employee.secondLastName ?? ''}`
      const schedule = employee.schedule

      const dayOfWeek = moment(date).format("dddd").toLowerCase()
      const scheduleForDay = (schedule as any)?.[dayOfWeek];

      if (!scheduleForDay || !scheduleForDay.start) { detail.push(`Dia no laboral para ${employeeName}`); continue }

      const attendance = attendances.find(x => x.employeeId === employee.id)
      if (attendance && attendance.checkOutTime != null) { detail.push(`${employeeName} Asistió`); continue }

      const scheduleException = scheduleExceptions.find(x => x.employeeId === employee.id)
      if (scheduleException) { detail.push(`No se registró falta para ${employeeName} (${scheduleException.reason})`); continue }

      const absence = absences.find(x => x.employeeId === employee.id)
      if (absence) { detail.push(`Ya habia una falta registrada para ${employeeName} el ${day}`); continue }

      const reason = attendance == null ? 'No se hizo el check in' : 'No se hizo el check out'

      const id = 'AB' + String(await consumeSequence('absences', session)).padStart(8, '0')
      const record = new AbsenceModel({ id, employeeId: employee.id, employeeName, date: day, reason })
      customLog(`Creando ausencia ${String(record.id)} (${employeeName}) (${reason})`)
      detail.push(`Se registró una falta para ${employeeName} (${String(record.id)}) (${reason})`);
      await record.save({ session })

      newAbsencesCount++;
    }

    customLog(detail)

    const totalAbsences = absences.length + newAbsencesCount;
    return { totalAbsences, newAbsences: newAbsencesCount, detail };
  }

  reformatData(array: any[]): any[] {
    const newArray = array.map(((record: IAbsence) => {
      const result: any = {
        ...JSON.parse(JSON.stringify(record)),
        title: record.isJustified ? 'Falta justificada' : 'Ausente'
      }
      return result
    }))
    return newArray
  }
}

const absenceService: AbsenceService = new AbsenceService()
export default absenceService
