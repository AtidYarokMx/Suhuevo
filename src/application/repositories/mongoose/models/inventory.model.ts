/* lib */
import { Schema, SchemaTypes, model } from '@app/repositories/mongoose'
/* handlers */
import { UserLogger } from '@app/handlers/loggers/user.logger'
/* types */
import { type IInventory } from '@app/dtos/inventory.dto'

export const InventorySchema = new Schema<IInventory>({
  date: { type: Date, required: true },
  chicken: { type: Number, required: true },
  water: { type: Number, required: true },
  food: { type: Number, required: true },
  /* relations */
  shed: { type: SchemaTypes.ObjectId, ref: "shed", required: true },
  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { discriminatorKey: "type" })

/* pre (middlewares) */
InventorySchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
InventorySchema.post('save', function (doc) {
  UserLogger.info(`[Farm][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const InventoryModel = model<IInventory>("inventory", InventorySchema)