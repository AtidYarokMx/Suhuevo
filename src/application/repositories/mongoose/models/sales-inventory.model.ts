import { Schema, model } from '@app/repositories/mongoose'
/* handlers */
import { DbLogger } from '@app/handlers/loggers/db.logger'
/* dtos */
import { ISalesInventory } from "@app/dtos/sales-inventory.dto";

export const SalesInventorySchema = new Schema<ISalesInventory>({
  /* required fields */
  shed: { type: Schema.Types.ObjectId, required: true, ref: 'shed' },
  code: { type: String, required: true, trim: true },
  weight: { type: Number, required: true },
  type: { type: Number, required: true },
  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
SalesInventorySchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
SalesInventorySchema.post('save', function (doc) {
  DbLogger.info(`[Payroll][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const SalesInventoryModel = model<ISalesInventory>('sales-inventory', SalesInventorySchema)