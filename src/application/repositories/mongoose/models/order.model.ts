/**
 * Modelo de Órdenes
 */

/* lib */
import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
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


/* model instance */
export const OrderModel = AppMainMongooseRepo.model<IOrder>("order", OrderSchema)