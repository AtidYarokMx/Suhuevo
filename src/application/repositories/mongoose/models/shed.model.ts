/**
 * Modelo de Casetas
 */

/* lib */
import { Schema, model } from '@app/repositories/mongoose'
import { UserLogger } from '@app/handlers/loggers/user.logger'
import { AppShedModel, type IShed, IShedVirtuals, ShedStatus } from '@app/dtos/shed.dto'

export const ShedSchema = new Schema<IShed, AppShedModel, {}, {}, IShedVirtuals>({
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true, required: true },
  week: { type: Number, default: 1 },
  period: { type: Number, default: 1 },
  initialChicken: { type: Number, required: true },
  /* enums */
  status: { type: String, enum: ShedStatus, default: ShedStatus.ACTIVE },
  /* relations */
  farm: { type: Schema.Types.ObjectId, ref: "farm", required: true },
  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

/* virtuals */
ShedSchema.virtual("inventory", {
  ref: "inventory",
  localField: "_id",
  foreignField: "shed",
  justOne: true
})

/* pre (middlewares) */
ShedSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
ShedSchema.post('save', function (doc) {
  UserLogger.info(`[Shed][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const ShedModel = model<IShed, AppShedModel>("shed", ShedSchema)