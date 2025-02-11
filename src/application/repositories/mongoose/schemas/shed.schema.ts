import { Model, Schema, SchemaTypes } from '@app/repositories/mongoose';
/* dtos */
import { type AppShedModel, type IShed, type IShedVirtuals, ShedStatus } from '@app/dtos/shed.dto';
import type { ICommonHistoryFields, IShedHistory } from '@app/dtos/common.dto';
import { isValidStatusChange } from '@app/utils/validate.util';

export const ShedSchema = new Schema<IShed, AppShedModel, {}, {}, IShedVirtuals>({
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true, required: true },
  week: { type: Number, default: 1 },
  period: { type: Number, default: 1 },
  initialChicken: { type: Number, required: true, default: 0 },
  chickenWeight: { type: Number, required: true, default: 0 },
  avgEggWeight: { type: Number, default: 0 },
  foodConsumed: { type: Number, default: 0 },
  waterConsumed: { type: Number, default: 0 },
  mortality: { type: Number, default: 0 },
  eggProduction: { type: Number, default: 0 },
  shedNumber: { type: Number, required: true, immutable: true },
  generationId: { type: String, default: null },
  ageWeeks: { type: Number, default: 0 },
  /* enums */
  status: {
    type: String,
    enum: Object.values(ShedStatus),
    default: ShedStatus.INACTIVE,
    validate: {
      validator: function (newStatus: string) {
        return isValidStatusChange(this.status as ShedStatus, newStatus as ShedStatus);
      },
      message: "Cambio de estado no permitido",
    },
  },

  /* relations */
  farm: { type: Schema.Types.ObjectId, ref: "farm", required: true },

  /* defaults */
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

/**
 * Historial de cambios en casetas
 */
export const ShedHistorySchema = new Schema<IShedHistory>({
  shedId: { type: Schema.Types.ObjectId, ref: "Shed", required: true },
  generationId: { type: String, required: true },
  change: { type: ShedSchema.clone(), required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
});