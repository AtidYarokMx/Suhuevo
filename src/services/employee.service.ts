/* lib */
import fs from 'fs-extra'
import path from 'node:path'
import { type ClientSession } from 'mongoose'
/* models */
import { EmployeeModel } from '@app/repositories/mongoose/models/employee.model'
import { AppFileModel, AppTemporalFileModel } from '@app/repositories/mongoose/models/file.model'
/* services */
import departmentService from './department.service'
import userService from './user.service'
import jobService from './job.service'
/* response models */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { consumeSequence } from '@app/utils/sequence'
import { customLog, getBaseSchedule } from '@app/utils/util.util'
/* consts */
import { docsDir, tempDocsDir } from '@app/constants/file.constants'
import { Types } from '@app/repositories/mongoose'
/* dtos */
import { AppUpdateBody, IEmployee } from '@app/dtos/employee.dto'

const tempStorageDir = path.join(__dirname, "../../../uploads/temp");
const employeeStorageDir = path.join(__dirname, "../../../uploads/employees");

class EmployeeService {

  private allowedUpdateFields = ['status', 'biometricId', 'name', 'lastName', 'secondLastName', 'email', 'phone', 'address', 'birthdate', 'bloodType', 'departmentId', 'jobId', 'hireDate', 'bankAccountNumber', 'dailySalary', 'schedule', 'mxCurp', 'mxRfc', 'mxNss', 'emergencyContact', 'emergencyPhone', 'jobScheme', 'ineFront', 'ineBack', 'contract', 'bankName', 'attendanceScheme', 'minOvertimeMinutes'] as (keyof AppUpdateBody)[]

  /* methods */
  async get(query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids]
    const records = await EmployeeModel.find({ active: true, id: { $in: ids } })

    const result: any = {}
    for (const record of records) result[record.id] = record
    return result
  }

  async search(query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query

    const allowedFields: (keyof IEmployee)[] = ['id', 'name', 'departmentId', 'jobId', 'mxCurp', 'mxRfc', 'mxNss', 'status']

    const filter: any = { active: true }
    const selection: any = size === 'small' ? {} : { active: 0, __v: 0 }

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

    const records = await EmployeeModel.find(filter).select(selection).limit(limit).sort({ createdAt: 'desc' }).populate(['ineFront', 'ineBack', 'contract']).exec()
    if (records.length === 0) return []
    return await this.populateResults(records)
  }

  async getEmployeeFiles(employeeId: string): Promise<string[]> {
    const employeeDir = path.join(employeeStorageDir, employeeId);

    if (!fs.existsSync(employeeDir)) {
      throw new Error("No se encontraron archivos para este empleado");
    }

    const files = await fs.readdir(employeeDir);
    return files;
  }

  async getEmployeeFilePath(employeeId: string, fileName: string): Promise<string> {
    const filePath = path.join(employeeStorageDir, employeeId, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error("Archivo no encontrado");
    }

    return filePath;
  }

  async create(body: any, tempFiles: string[], session: ClientSession): Promise<any> {
    const id = String(await consumeSequence('employees', session)).padStart(6, '0');
    const schedule = getBaseSchedule(body.jobScheme, body.timeEntry, body.timeDeparture);

    /* Crear usuario si no existe */
    let userId = undefined;
    if (body.createUser == null) {
      const allowedRoles = ['employee.hr', 'employee'];
      const user = await userService.create({
        userName: body.email,
        name: body.name,
        lastName: body.lastName,
        secondLastName: body.secondLastName,
        role: allowedRoles.includes(body.role) ? body.role : 'employee',
        phone: body.phone,
        email: body.email
      }, session);
      userId = user.id;
    }

    // 🔹 Mover archivos desde `/uploads/temp/` a `/uploads/employees/{employeeId}/`
    const employeeDir = path.join(employeeStorageDir, id);
    await fs.ensureDir(employeeDir);

    const filePaths: string[] = [];
    if (tempFiles && Array.isArray(tempFiles)) {
      for (const tempFileName of tempFiles) {
        const tempPath = path.join(tempStorageDir, tempFileName);
        const newPath = path.join(employeeDir, tempFileName);
        if (fs.existsSync(tempPath)) {
          await fs.rename(tempPath, newPath);
          filePaths.push(newPath);
        }
      }
    }

    // 🔹 Guardar empleado en la BD con las rutas de archivos
    const record = new EmployeeModel({
      ...body,
      id,
      schedule,
      userId,
      roleId: body.roleId ?? "67bf6ea470d366194e1a28cd",
      documentPaths: filePaths // 🔹 Guardar rutas en BD
    });

    customLog(`Empleado ${record.id} creado con éxito con ${filePaths.length} documentos.`);
    await record.save({ session });

    return { id: record.id, documentPaths: filePaths };
  }



  async update(body: AppUpdateBody, session: ClientSession): Promise<any> {
    const record = await EmployeeModel.findOne({ id: body.id })
    if (record == null) throw new AppErrorResponse({ statusCode: 404, name: 'No se encontró el empleado' })

    for (const field of this.allowedUpdateFields) {
      if (!(typeof body[field] !== 'undefined' && body[field] !== '')) continue

      if (!['ineFront', 'ineBack', 'contract'].includes(field)) {
        (record as any)[field] = body[field]
        continue
      }

      const id = body[field]
      if (!Types.ObjectId.isValid(id as any)) continue

      const tempFile = await AppTemporalFileModel.findById(id)
      if (tempFile == null) continue

      const file = new AppFileModel({
        idUser: tempFile.idUser,
        filename: tempFile.filename,
        mimetype: tempFile.mimetype,
        path: '/docs/',
        size: tempFile.size,
      })
      fs.renameSync(`${path.join(tempDocsDir, tempFile.filename)}`, `${path.join(docsDir, file.filename)}`)
      const savedFile = await file.save({ session });
      (record as any)[field] = savedFile._id
    }

    if (body.schedule != null && typeof body.schedule === 'string') record.schedule = JSON.parse(body.schedule)

    const savedRecord = await record.save({ validateBeforeSave: true, session })
    const populated = await savedRecord.populate(['ineFront', 'ineBack', 'contract'])
    return { ...populated.toJSON() }
  }

  async delete(body: any, session: ClientSession): Promise<any> {
  }

  async populateResults(array: IEmployee[]): Promise<any> {
    const departmentIds = array.map(x => x.departmentId)
    const jobIds = array.map(x => x.jobId)

    const departments = await departmentService.get({ ids: departmentIds })
    const jobs = await jobService.get({ ids: jobIds })

    const populatedArray = JSON.parse(JSON.stringify(array))
    for (const record of populatedArray) {
      record.departmentName = departments[record.departmentId]?.name
      record.jobName = jobs[record.jobId]?.name
      record.timeEntry = Object.values(record.schedule as IEmployee).find(x => x?.start != null)?.start
      record.timeDeparture = Object.values(record.schedule as IEmployee).find(x => x?.end != null)?.end
      record.ineFront = record.ineFront?.fullpath ?? null
      record.ineBack = record.ineBack?.fullpath ?? null
      record.contract = record.contract?.fullpath ?? null
    }

    return populatedArray
  }
}

const employeeService: EmployeeService = new EmployeeService()
export default employeeService
