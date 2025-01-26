import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IPayroll } from '@app/dtos/payroll.dto'

export const PayrollSchema = new Schema<IPayroll>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },

  lines: { type: [Object] },

  startDate: { type: String },
  cutoffDate: { type: String },

  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
PayrollSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
PayrollSchema.post('save', function (doc) {
  DbLogger.info(`[Payroll][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const PayrollModel = AppMainMongooseRepo.model<IPayroll>('payroll', PayrollSchema)
