import { Schema, model } from '@app/repositories/mongoose'
/* handlers */
import { DbLogger } from '@app/handlers/loggers/db.logger'
/* dtos */
import { CatalogPersonalBonusType, ICatalogPersonalBonus } from '@app/dtos/catalog-personal-bonus.dto'


export const CatalogPersonalBonusSchema = new Schema<ICatalogPersonalBonus>({
  /* required fields */
  name: { type: String, required: true, trim: true },
  value: { type: Number, required: true },
  taxable: { type: Boolean, required: true, default: true },
  enabled: { type: Boolean, default: true },
  type: { type: String, enum: CatalogPersonalBonusType, required: true, default: CatalogPersonalBonusType.AMOUNT },
  /* html identifiers for front */
  inputId: { type: String, required: true },
  inputName: { type: String, required: true },
  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
CatalogPersonalBonusSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})
CatalogPersonalBonusSchema.pre('updateOne', async function (next) {
  this.set({ updatedAt: new Date(Date.now()) })
  next()
})

/* post (middlewares) */
CatalogPersonalBonusSchema.post('save', function (doc) {
  DbLogger.info(`[PersonalBonus][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const CatalogPersonalBonusModel = model<ICatalogPersonalBonus>('catalog-personal-bonus', CatalogPersonalBonusSchema)
