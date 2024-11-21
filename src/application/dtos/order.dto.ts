import { Types } from "@app/repositories/mongoose"

export type IOrder = {
  id: number // sqlserver id for relations
  farm: Types.ObjectId
  status: number // should be an enum or something
  reception: Date
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}