import { Schema, model } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { EEmployeStatus, AppEmployeeModel, IEmployee, IEmployeeMethods, IEmployeeVirtuals } from '@app/dtos/employee.dto'


export const EmployeeSchema = new Schema<IEmployee, AppEmployeeModel, IEmployeeMethods, Record<string, unknown>, IEmployeeVirtuals>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },
  status: { type: String, enum: EEmployeStatus, default: EEmployeStatus.ACTIVE, required: true },
  biometricId: { type: String },

  name: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  secondLastName: { type: String, trim: true },

  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  birthdate: { type: String },
  bloodType: { type: String },

  departmentId: { type: String, required: true },
  hireDate: { type: String },
  jobId: { type: String, required: true },
  schedule: {
    type: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    }
  },
  bankAccountNumber: { type: String },
  dailySalary: { type: Number },

  mxCurp: { type: String, trim: true },
  mxRfc: { type: String, trim: true },
  mxNss: { type: String, trim: true },

  emergencyContact: { type: String, trim: true },
  emergencyPhone: { type: String, trim: true },

  jobScheme: { type: String, trim: true },

  userId: { type: String },

  /* documents */
  ineFront: { type: Schema.Types.ObjectId, ref: "file" },
  ineBack: { type: Schema.Types.ObjectId, ref: "file" },
  contract: { type: Schema.Types.ObjectId, ref: "file" },

  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

/* methods */
EmployeeSchema.method('fullname', function fullname() {
  /* solución alterna */
  // const nameParts = [this.name, this.lastName, this.secondLastName].filter(Boolean);
  // return nameParts.join(' ');
  return `${this.name ?? ''} ${this.lastName ?? ''} ${this.secondLastName ?? ''}`.trim()
})

EmployeeSchema.virtual("job", {
  ref: "job",
  localField: "jobId",
  foreignField: "id",
  justOne: true
})

EmployeeSchema.virtual("department", {
  ref: "department",
  localField: "departmentId",
  foreignField: "id",
  justOne: true
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
export const EmployeeModel = model<IEmployee, AppEmployeeModel>('employee', EmployeeSchema)
