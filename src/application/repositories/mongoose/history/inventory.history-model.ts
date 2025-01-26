import { AppHistoryMongooseRepo } from '@app/repositories/mongoose'
import { InventorySchema } from '@app/repositories/mongoose/models/inventory.model'
import { IInventory } from '@app/dtos/inventory.dto'

export const InventoryHistoryModel = AppHistoryMongooseRepo.model<IInventory>("inventory", InventorySchema)