import { Schema, model } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { EEmployeStatus, IEmployee } from '@app/dtos/employee.dto'


export const EmployeeSchema = new Schema<IEmployee>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },
  status: { type: String, enum: EEmployeStatus, default: EEmployeStatus.ACTIVE, required: true },

  name: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  secondLastName: { type: String, trim: true },

  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  birthdate: { type: String },
  bloodType: { type: String },

  departmentId: { type: String },
  hireDate: { type: String },
  jobId: { type: String },
  schedule: { type: Object },
  bankAccountNumber: { type: String },
  dailySalary: { type: Number },
  
  mxCurp: { type: String, trim: true },
  mxRfc: { type: String, trim: true },
  mxNss: { type: String, trim: true },

  emergencyContact: { type: String, trim: true },
  emergencyPhone: { type: String, trim: true },

  jobScheme: { type: String, trim: true },

  userId: { type: String },

  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
EmployeeSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
EmployeeSchema.post('save', function (doc) {
  DbLogger.info(`[Employee][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const EmployeeModel = model<IEmployee>('employee', EmployeeSchema)
