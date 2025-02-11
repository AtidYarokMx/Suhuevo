import { Model, Schema, SchemaTypes } from '@app/repositories/mongoose'
/* dtos */
import { AppFarmModel, FarmStatus, IFarm, IFarmVirtuals } from '@app/dtos/farm.dto'
import type { ICommonHistoryFields } from '@app/dtos/common.dto'
import { FarmModel } from '../models/farm.model';

export const FarmSchema = new Schema<IFarm, AppFarmModel, {}, {}, IFarmVirtuals>({
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true, required: true },
  farmNumber: {
    type: Number, validate: {
      validator: async function (value: number) {
        const count = await FarmModel.countDocuments({ farmNumber: value });
        return count === 0
      },
      message: "Ya existe un registro con ese id"
    }
  },
  /* enums */
  status: { type: String, enum: FarmStatus, default: FarmStatus.ACTIVE },
  /* defaults */
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

export const FarmHistorySchema = new Schema<ICommonHistoryFields<IFarm>>({
  change: { type: FarmSchema.clone(), required: true },
  updatedAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedBy: { type: SchemaTypes.ObjectId, required: true }
})