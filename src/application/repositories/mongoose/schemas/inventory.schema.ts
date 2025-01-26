import { Schema, SchemaTypes } from '@app/repositories/mongoose'
/* types */
import type { IInventory } from '@app/dtos/inventory.dto'
import type { ICommonHistoryFields } from '@app/dtos/common.dto'

export const InventorySchema = new Schema<IInventory>({
  date: { type: Date, required: true },
  chicken: { type: Number, default: 0 },
  mortality: { type: Number, default: 0 },
  water: { type: Number, required: true },
  food: { type: Number, required: true },
  /* relations */
  shed: { type: SchemaTypes.ObjectId, ref: "shed", required: true },
  /* defaults */
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
})

export const InventoryHistorySchema = new Schema<ICommonHistoryFields<IInventory>>({
  change: { type: Object, required: true },
  updatedAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedBy: { type: SchemaTypes.ObjectId, ref: "user", required: true }
})