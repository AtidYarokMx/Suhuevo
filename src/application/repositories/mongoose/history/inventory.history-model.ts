import { AppHistoryMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { InventoryHistorySchema } from '@app/repositories/mongoose/schemas/inventory.schema'
/* dtos */
import { IInventory } from '@app/dtos/inventory.dto'
import { ICommonHistoryFields } from '@app/dtos/common.dto'

export const InventoryHistoryModel = AppHistoryMongooseRepo.model<ICommonHistoryFields<IInventory>>("inventory", InventoryHistorySchema)