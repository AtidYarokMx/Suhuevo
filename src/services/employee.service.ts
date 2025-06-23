/* lib */
import fs from "fs-extra";
import path from "node:path";
import { type ClientSession } from "mongoose";
/* models */
import { EmployeeModel } from "@app/repositories/mongoose/models/employee.model";
import { AppFileModel, AppTemporalFileModel } from "@app/repositories/mongoose/models/file.model";
/* services */
import departmentService from "./department.service";
import userService from "./user.service";
import jobService from "./job.service";
/* response models */
import { AppErrorResponse } from "@app/models/app.response";
/* utils */
import { consumeSequence } from "@app/utils/sequence";
import { customLog, getBaseSchedule } from "@app/utils/util.util";
/* consts */
import { docsDir, tempDocsDir } from "@app/constants/file.constants";
import { Types } from "@app/repositories/mongoose";
/* dtos */
import { AppUpdateBody, IEmployee } from "@app/dtos/employee.dto";
import fileService from "./file.service";

const tempStorageDir = path.join(__dirname, "../../../uploads/temp");
const employeeStorageDir = path.join(__dirname, "../../../uploads/employees");

class EmployeeService {
  private allowedUpdateFields = [
    "status",
    "biometricId",
    "name",
    "lastName",
    "secondLastName",
    "email",
    "phone",
    "address",
    "birthdate",
    "bloodType",
    "departmentId",
    "jobId",
    "hireDate",
    "bankAccountNumber",
    "dailySalary",
    "schedule",
    "mxCurp",
    "mxRfc",
    "mxNss",
    "emergencyContact",
    "emergencyPhone",
    "jobScheme",
    "ineFront",
    "ineBack",
    "contract",
    "bankName",
    "attendanceScheme",
    "minOvertimeMinutes",
  ] as (keyof AppUpdateBody)[];

  /* methods */
  async get(query: any): Promise<any> {
    const ids = Array.isArray(query.ids) ? query.ids : [query.ids];
    const records = await EmployeeModel.find({ active: true, id: { $in: ids } });

    const result: any = {};
    for (const record of records) result[record.id] = record;
    return result;
  }

  async moveAndSaveFiles(employeeId: string, tempFiles: string[]): Promise<string[]> {
    customLog(`Moving files to employee ${employeeId}`);
    customLog(`Temp files: ${tempFiles.join(", ")}`);
    customLog(`Temp storage dir: ${tempStorageDir}`);
    customLog(`Employee storage dir: ${employeeStorageDir}`);

    if (!employeeId || !Array.isArray(tempFiles)) {
      throw new Error("Invalid request: employeeId or tempFiles missing");
    }

    // 🔹 Mover archivos al directorio final
    const filePaths = await fileService.moveFilesToEmployee(employeeId, tempFiles);

    // 🔹 Actualizar el modelo del empleado
    await EmployeeModel.findByIdAndUpdate(employeeId, { $push: { documents: { $each: filePaths } } });

    return filePaths;
  }

  async search(query: any): Promise<any> {
    const { limit = 100, size, sortField, ...queryFields } = query;

    const allowedFields: (keyof IEmployee)[] = [
      "id",
      "name",
      "departmentId",
      "jobId",
      "mxCurp",
      "mxRfc",
      "mxNss",
      "status",
    ];

    const filter: any = { active: true };
    const selection: any = size === "small" ? {} : { active: 0, __v: 0 };

    for (const field in queryFields) {
      if (!(allowedFields as any[]).includes(field.replace(/[~<>]/, ""))) {
        throw new AppErrorResponse({ statusCode: 403, name: `Campo no permitido: ${field}` });
      }

      const value = queryFields[field];
      const cleanField = field.replace(/[~<>]/, "");

      if (Array.isArray(value)) {
        filter[cleanField] = { $in: value };
      } else if (field.startsWith("~")) {
        filter[cleanField] = new RegExp("" + String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      } else if (field.startsWith("<")) {
        filter[cleanField] = { ...filter[cleanField], $lt: value };
      } else if (field.startsWith(">")) {
        filter[cleanField] = { ...filter[cleanField], $gt: value };
      } else {
        filter[cleanField] = value;
      }
    }

    const records = await EmployeeModel.find(filter).select(selection).limit(limit).sort({ createdAt: "desc" }).exec();
    if (records.length === 0) return [];
    return await this.populateResults(records);
  }

  async getSchedule(): Promise<any> {
    const records = await EmployeeModel.find({ active: true })
      .select({ _id: true, id: true, name: true, lastName: true, secondLastName: true, schedule: true })
      .sort({ createdAt: "desc" })
      .exec();

    if (records.length === 0) return [];
    return records;
  }

  async bulkSchedule(data: any[], session: ClientSession) {
    const updateBody = data.map(({ _id, ...item }) => {
      console.log(item.schedule);
      return {
        updateOne: {
          filter: { _id: Types.ObjectId.createFromHexString(_id) },
          update: { $set: { ...item, schedule: { ...item.schedule } } },
          upsert: true,
        },
      };
    });
    const records = await EmployeeModel.bulkWrite(updateBody, { session, ordered: false });
    return records;
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
    customLog("Creando empleado...");
    customLog("Datos:", body);
    const id = String(await consumeSequence("employees", session)).padStart(6, "0");
    const schedule = getBaseSchedule(body.jobScheme, body.timeEntry, body.timeDeparture);

    let userId = undefined;
    if (!body.createUser) {
      const allowedRoles = ["employee.hr", "employee"];
      const user = await userService.create(
        {
          userName: body.email,
          name: body.name,
          lastName: body.lastName,
          secondLastName: body.secondLastName,
          role: allowedRoles.includes(body.role) ? body.role : "employee",
          phone: body.phone,
          email: body.email,
        },
        session
      );
      userId = user.id;
    }

    // ✅ Mover archivos temporales al directorio final del empleado
    const { ineFront, ineBack, contract } = body;
    const files = [ineFront, ineBack, contract].filter((f): f is string => typeof f === "string" && f.trim() !== "");


    customLog(`Archivos movidos con éxito: ${files.length} archivos.`);
    // ✅ Crear el registro del empleado con los archivos
    const record = new EmployeeModel({
      ...body,
      id,
      schedule,
      userId,
      roleId: body.roleId ?? "67bf6ea470d366194e1a28cd",
      ineFront: body.ineFront,
      ineBack: body.ineBack,
      contract: body.contract,
      jobApplication: body.jobApplication,
      csf: body.csf,
      nss: body.nss,
      curpFile: body.curpFile,
      bankFile: body.bankFile,
      addressDoc: body.addressDoc,
      resume: body.resume,
      birthFile: body.birthFile,
    });

    customLog(`Empleado ${record.id} creado con éxito con ${files.length} documentos.`);
    await record.save({ session });

    for (const file of files) {
      if (typeof file === "string" && file.trim() !== "") {
        const tempPath = path.join(tempDocsDir, file);
        const destPath = path.join(docsDir, file);

        try {
          // Solo mover si el archivo existe en temporales
          if (fs.existsSync(tempPath)) {
            fs.renameSync(tempPath, destPath);
            customLog(`✅ Archivo movido desde temporales: ${file}`);
          } else {
            customLog(`🔸 Archivo ya estaba en destino o no fue modificado: ${file}`);
          }
        } catch (err) {
          customLog(`❌ Error al mover archivo ${file}: ${String(err)}`, "red");
        }
      }
    }

    return { id: record.id };
  }

  async update(body: AppUpdateBody, session: ClientSession): Promise<any> {
    const record = await EmployeeModel.findOne({ id: body.id });
    if (record == null) throw new AppErrorResponse({ statusCode: 404, name: "No se encontró el empleado" });

    const { ineFront, ineBack, contract } = body;
    const files = [ineFront, ineBack, contract].filter((f): f is string => typeof f === "string" && f.trim() !== "");


    for (const file of files) {
      if (typeof file === "string" && file.trim() !== "") {
        const tempPath = path.join(tempDocsDir, file);
        const destPath = path.join(docsDir, file);

        try {
          // Solo mover si el archivo existe en temporales
          if (fs.existsSync(tempPath)) {
            fs.renameSync(tempPath, destPath);
            customLog(`✅ Archivo movido desde temporales: ${file}`);
          } else {
            customLog(`🔸 Archivo ya estaba en destino o no fue modificado: ${file}`);
          }
        } catch (err) {
          customLog(`❌ Error al mover archivo ${file}: ${String(err)}`, "red");
        }
      }
    }

    if (body.schedule && typeof body.schedule === "string") {
      try {
        body.schedule = JSON.parse(body.schedule);
      } catch (err) {
        throw new AppErrorResponse({ statusCode: 400, name: "Formato inválido en schedule" });
      }
    }

    record.set({ ...body });
    const savedRecord = await record.save({ validateBeforeSave: true, session });
    return savedRecord.toJSON();
  }



  async delete(body: any, session: ClientSession): Promise<any> { }

  async populateResults(array: IEmployee[]): Promise<any> {
    const departmentIds = array.map((x) => x.departmentId);
    const jobIds = array.map((x) => x.jobId);

    const departments = await departmentService.get({ ids: departmentIds });
    const jobs = await jobService.get({ ids: jobIds });

    const populatedArray = JSON.parse(JSON.stringify(array));
    for (const record of populatedArray) {
      record.departmentName = departments[record.departmentId]?.name;
      record.jobName = jobs[record.jobId]?.name;
      record.timeEntry = Object.values(record.schedule as IEmployee).find((x) => x?.start != null)?.start;
      record.timeDeparture = Object.values(record.schedule as IEmployee).find((x) => x?.end != null)?.end;
    }

    return populatedArray;
  }

}

const employeeService: EmployeeService = new EmployeeService();
export default employeeService;
