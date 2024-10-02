import type { Types } from '@app/repositories/mongoose'

export type IRule = {
  _id: Types.ObjectId
  name: string
  description: string
  formula: string
  variables: string[]
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

/* endpoint types */
export type ICreateBody = {
  name: string
  description: string
  formula: string
  variables: string[]
}