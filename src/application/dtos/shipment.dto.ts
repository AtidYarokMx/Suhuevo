/* types */
import { ICommonFields } from '@app/dtos/common.dto'
import { Types } from '@app/repositories/mongoose'

export enum ShipmentCodeStatus {
  review = 1,
  rejected = 2,
  received = 3,
  approved = 4,
  sent = 5,
}

export enum ShipmentStatus {
  review = 1,
  completed = 2,
  rejected = 3,
  received = 4,
  approved = 5,
  sent = 6,
}

export type IShipmentCode = {
  description?: string
  code: Types.ObjectId
  status?: ShipmentCodeStatus
}

export type IShipmentSummary = {
  totalBoxes: number;
  totalNetWeight: number;
  totalEggs: number;
  totalByCategory: Record<string, {
    count: number;
    totalNetWeight: number;
    totalEggs: number;
  }>;
};

export type IShipment = ICommonFields & {
  shipmentId: string;
  id: string;
  name: string;
  description?: string;
  codes: IShipmentCode[];
  status: ShipmentStatus;
  vehiclePlates: string;
  driver: string;
  summary: IShipmentSummary;
}

export type IShipmentCounter = {
  _id: Types.ObjectId;
  value: number;
}
