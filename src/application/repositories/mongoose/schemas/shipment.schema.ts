/* types */
import { Schema, SchemaTypes } from '@app/repositories/mongoose'
/* dtos */
import { IShipment, ShipmentCodeStatus, ShipmentStatus } from "@app/dtos/shipment.dto";
import { ICommonCounterFields, ICommonHistoryFields } from '@app/dtos/common.dto';

export const ShipmentSchema = new Schema<IShipment>({
  /* required fields */
  id: { type: String, immutable: true },
  name: { type: String, required: true },
  description: { type: String },
  codes: [{
    description: { type: String },
    code: { type: SchemaTypes.ObjectId, ref: "box-production", required: true },
    status: { type: Number, enum: ShipmentCodeStatus, default: ShipmentCodeStatus.review }
  }],
  vehiclePlates: { type: String, required: true },
  status: { type: Number, enum: ShipmentStatus, default: ShipmentStatus.review },
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

export const ShipmentCounterSchema = new Schema<ICommonCounterFields>({
  id: { type: String, unique: true, required: true },
  value: { type: Number, default: 0 }
})