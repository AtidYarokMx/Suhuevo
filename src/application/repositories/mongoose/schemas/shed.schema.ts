import { Schema, SchemaTypes } from '@app/repositories/mongoose'
/* dtos */
import { type AppShedModel, type IShed, type IShedVirtuals, ShedStatus } from '@app/dtos/shed.dto'
import type { ICommonHistoryFields } from '@app/dtos/common.dto'

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
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

export const ShedHistorySchema = new Schema<ICommonHistoryFields<IShed>>({
  change: { type: ShedSchema.clone(), required: true },
  updatedAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedBy: { type: SchemaTypes.ObjectId, required: true }
})