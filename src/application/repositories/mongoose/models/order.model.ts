/**
 * Modelo de Órdenes
 */

/* lib */
import { Schema, model } from '@app/repositories/mongoose'
/* handlers */
import { UserLogger } from '@app/handlers/loggers/user.logger'
/* types */
import { IOrder } from '@app/dtos/order.dto'

export const OrderSchema = new Schema<IOrder>({
  id: { type: Number, unique: true, required: true },
  farm: { type: Schema.Types.ObjectId, required: true, ref: "farm" },
  status: { type: Number, required: true },
  reception: { type: Date },
  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { collection: "orders" })

/* pre (middlewares) */
OrderSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
OrderSchema.post('save', function (doc) {
  UserLogger.info(`[Order][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const OrderModel = model<IOrder>("order", OrderSchema)