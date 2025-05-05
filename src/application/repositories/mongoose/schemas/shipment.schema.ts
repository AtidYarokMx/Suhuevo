import { Schema, SchemaTypes, AppMainMongooseRepo } from "@app/repositories/mongoose";
import mongoose from "mongoose";
import { IShipment, ShipmentCodeStatus, ShipmentStatus } from "@app/dtos/shipment.dto";
import { ICommonCounterFields, ICommonHistoryFields } from "@app/dtos/common.dto";

// Schema principal para envíos
export const ShipmentSchema = new Schema<IShipment>({
  shipmentId: { type: String, required: true, unique: true },
  description: { type: String },
  codes: [
    {
      codeId: { type: SchemaTypes.ObjectId, ref: "box-production", required: true },
      code: { type: String, required: true },
    },
  ],
  vehiclePlates: { type: String, required: true },
  driver: { type: String, required: true },
  status: { type: Number, enum: ShipmentStatus, default: ShipmentStatus.review },
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  summary: {
    totalBoxes: { type: Number, required: true },
    totalNetWeight: { type: Number, required: true },
    totalEggs: { type: Number, required: true },
    totalByCategory: {
      type: Map,
      of: new Schema({
        count: { type: Number, required: true },
        totalNetWeight: { type: Number, required: true },
        totalEggs: { type: Number, required: true },
      }),
      required: true,
    },
  },
});

// Modelo principal del envío
export const ShipmentModel = AppMainMongooseRepo.model<IShipment>("Shipment", ShipmentSchema);

// Historial para guardar cambios
export const ShipmentHistorySchema = new Schema<ICommonHistoryFields<IShipment>>({
  change: {
    type: {
      ...ShipmentSchema.clone().obj,
      shipmentId: { type: String, required: true, unique: false },
    },
    required: true,
  },
  updatedAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedBy: { type: SchemaTypes.ObjectId, required: true },
});

// Contador para IDs de envíos
export const ShipmentCounterSchema = new Schema<ICommonCounterFields>({
  id: { type: String, unique: true, required: true },
  value: { type: Number, default: 0 },
});
