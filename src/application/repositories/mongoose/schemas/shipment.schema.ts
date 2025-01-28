/* types */
import { Schema, SchemaTypes } from '@app/repositories/mongoose'
/* dtos */
import { IShipment } from "@app/dtos/shipment.dto";
import { ICommonHistoryFields } from '@app/dtos/common.dto';

export const ShipmentSchema = new Schema<IShipment>({
  /* required fields */
  name: { type: String, required: true },
  description: { type: String },
  codes: [{ type: SchemaTypes.ObjectId, ref: "box-production", required: true }],
  /* defaults */
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
})

export const ShipmentHistorySchema = new Schema<ICommonHistoryFields<IShipment>>({
  change: { type: ShipmentSchema.clone(), required: true },
  updatedAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedBy: { type: SchemaTypes.ObjectId, required: true }
})