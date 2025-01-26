import { Types } from "@app/repositories/mongoose"

export type ICommonFields = {
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
  lastUpdateBy: Types.ObjectId
  createdBy: Types.ObjectId
}

export type ICommonHistoryFields<T> = {
  change: T
  /* defaults */
  updatedAt: Date
  updatedBy: Types.ObjectId
}