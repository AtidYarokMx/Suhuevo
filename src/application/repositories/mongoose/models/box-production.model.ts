/**
 * Modelo de Órdenes
 */

/* lib */
import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
/* handlers */
import { UserLogger } from '@app/handlers/loggers/user.logger'
/* types */
import { IBoxProduction } from '@app/dtos/box-production.dto'

export const BoxProductionSchema = new Schema<IBoxProduction>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  farmNumber: { type: Number, required: true },
  shedNumber: { type: Number, required: true },
  farm: { type: Schema.Types.ObjectId, ref: "farm" },
  shed: { type: Schema.Types.ObjectId, ref: "shed" },
  code: { type: String, required: true, unique: true },
  weight: { type: Number, required: true },
  status: { type: Number, required: true },
  type: { type: Schema.Types.ObjectId, required: true },
  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { collection: "box-production" })

/* pre (middlewares) */
BoxProductionSchema.pre('save', async function (next) {
  this.updatedAt = new Date()
  next()
})

/* post (middlewares) */
BoxProductionSchema.post('save', function (doc) {
  UserLogger.info(`[Producción de Cajas][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const BoxProductionModel = AppMainMongooseRepo.model<IBoxProduction>("box-production", BoxProductionSchema)