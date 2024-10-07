import type { Types } from '@app/repositories/mongoose'

export type ICatalogRule = {
  _id: Types.ObjectId
  name: string
  description: string
  formula: string
  variables: string[]
  priority?: number
  taxable?: boolean
  enabled?: boolean
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

/* endpoint types */
export type ICreateBody = {
  _id?: Types.ObjectId
  name: string
  description: string
  formula: string
  variables: string[]
  priority?: number
  taxable?: boolean
  enabled?: boolean
  /* defaults */
  active?: boolean
}

export type IUpdateBody = {
  _id: Types.ObjectId
  taxable?: boolean
  enabled?: boolean
  priority?: number
  /* defaults */
  active?: boolean
}