import type { Types } from '@app/repositories/mongoose'

export type IRule = {
  _id: Types.ObjectId
  name: string
  description: string
  formula: string
  variables: string[]
  priority?: number
  taxable?: boolean
  enabled?: boolean
  /* populated */
  entityId: Types.ObjectId
  idEmployee: Types.ObjectId
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
  /* populated */
  entityId: Types.ObjectId
  idEmployee: Types.ObjectId
  /* defaults */
  active?: boolean
}

export type IUpdateBody = {
  _id: Types.ObjectId
  taxable?: boolean
  enabled?: boolean
  priority?: number
  /* populated */
  entityId: Types.ObjectId
  idEmployee: Types.ObjectId
  /* defaults */
  active?: boolean
}