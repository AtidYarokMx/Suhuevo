import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
/* handlers */
import { DbLogger } from '@app/handlers/loggers/db.logger'
/* dtos */
import { PersonalBonusType, IPersonalBonus, PersonalBonusEntityType } from '@app/dtos/personal-bonus.dto'


export const PersonalBonusSchema = new Schema<IPersonalBonus>({
  /* required fields */
  name: { type: String, required: true, trim: true },
  value: { type: Number, required: true },
  taxable: { type: Boolean, required: true, default: true },
  type: { type: String, enum: PersonalBonusType, required: true, default: PersonalBonusType.AMOUNT },
  enabled: { type: Boolean, default: true },
  entityType: { type: String, enum: PersonalBonusEntityType, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true, refPath: "entityType" },
  /* html identifiers for front */
  inputId: { type: String, required: true },
  inputName: { type: String, required: true },
  /* populated */
  idEmployee: { type: Schema.Types.ObjectId, required: true, ref: "employee" },
  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
PersonalBonusSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

PersonalBonusSchema.pre('updateOne', async function (next) {
  this.set({ updatedAt: new Date(Date.now()) })
  next()
})

/* post (middlewares) */
PersonalBonusSchema.post('save', function (doc) {
  DbLogger.info(`[PersonalBonus][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const PersonalBonusModel = AppMainMongooseRepo.model<IPersonalBonus>('personal-bonus', PersonalBonusSchema)
