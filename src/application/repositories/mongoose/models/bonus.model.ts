import { Schema, model } from '@app/repositories/mongoose'
/* handlers */
import { DbLogger } from '@app/handlers/loggers/db.logger'
/* dtos */
import { BonusType, IBonus, AppBonus, IAppBonusVirtuals } from '@app/dtos/bonus.dto'


export const BonusSchema = new Schema<IBonus, AppBonus, {}, {}, IAppBonusVirtuals>({
  /* required fields */
  name: { type: String, required: true, trim: true },
  value: { type: Number, required: true },
  taxable: { type: Boolean, required: true, default: true },
  enabled: { type: Boolean, default: true },
  type: { type: String, enum: BonusType, required: true, default: BonusType.AMOUNT },
  /* html identifiers for front */
  inputId: { type: String, required: true },
  inputName: { type: String, required: true },
  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

/* virtual fields */
BonusSchema.virtual("entityType").get(function () {
  return "bonus"
})

/* pre (middlewares) */
BonusSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})
BonusSchema.pre('updateOne', async function (next) {
  this.set({ updatedAt: new Date(Date.now()) })
  next()
})

/* post (middlewares) */
BonusSchema.post('save', function (doc) {
  DbLogger.info(`[Bonus][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const BonusModel = model<IBonus, AppBonus>('bonus', BonusSchema)
