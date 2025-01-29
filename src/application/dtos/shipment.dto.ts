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

export type IShipment = ICommonFields & {
  id: string
  name: string
  description?: string
  codes: IShipmentCode[]
  status: ShipmentStatus
}

export type IShipmentCounter = {
  _id: Types.ObjectId
  value: number
}
