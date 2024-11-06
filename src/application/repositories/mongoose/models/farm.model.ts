/**
 * Modelo de Granjas
 */

/* lib */
import { Schema, model } from '@app/repositories/mongoose'
import { UserLogger } from '@app/handlers/loggers/user.logger'
import { type IFarm, FarmStatus } from '@app/dtos/farm.dto'

export const FarmSchema = new Schema<IFarm>({
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true, required: true },
  /* enums */
  status: { type: String, enum: FarmStatus, default: FarmStatus.ACTIVE },
  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
})

/* pre (middlewares) */
FarmSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
FarmSchema.post('save', function (doc) {
  UserLogger.info(`[Farm][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const FarmModel = model<IFarm>("farm", FarmSchema)