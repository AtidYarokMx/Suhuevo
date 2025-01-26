import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { EPayrollBonusType, IPayrollBonus } from '@app/dtos/payroll-bonus.dto'

export const PayrollBonusSchema = new Schema<IPayrollBonus>({
  id: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: EPayrollBonusType, required: true },

  amount: { type: Number },
  percentage: { type: Number },
  employeeIds: { type: [String] },

  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
PayrollBonusSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
PayrollBonusSchema.post('save', function (doc) {
  DbLogger.info(`[Payroll Bonus][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const PayrollBonus = AppMainMongooseRepo.model<IPayrollBonus>('payroll-bonus', PayrollBonusSchema)
