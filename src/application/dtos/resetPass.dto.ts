import { type Model } from 'mongoose'

export interface IResetPass {
  email: string
  uuid: string

  updatedAt: Date
  createdAt: Date

}

export type TResetModel = Model<IResetPass, Record<string, unknown>>
