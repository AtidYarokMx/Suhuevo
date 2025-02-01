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

export type ICommonCounterFields = {
  _id: Types.ObjectId
  id: string
  value: number
}

export type ICommonCatalogFields<T = void> = T & ICommonFields & {
  _id: Types.ObjectId
  id: string
  name: string
  description?: string
}