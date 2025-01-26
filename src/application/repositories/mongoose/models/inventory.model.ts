/* lib */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* history */
import { InventoryHistoryModel } from '@app/repositories/mongoose/history/inventory.history-model'
/* schema */
import { InventorySchema } from '@app/repositories/mongoose/schemas/inventory.schema'
/* types */
import { type IInventory } from '@app/dtos/inventory.dto'

/* pre (middlewares) */
InventorySchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
InventorySchema.post('save', async function (doc) {
  const history = new InventoryHistoryModel({
    change: { ...doc },
    updatedBy: doc.lastUpdateBy
  })
  await history.save()
})

/* model instance */
export const InventoryModel = AppMainMongooseRepo.model<IInventory>("inventory", InventorySchema)