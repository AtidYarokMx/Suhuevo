import type { Types } from '@app/repositories/mongoose'
import type { Model } from 'mongoose'

export interface IResetPass {
  uuid: string
  user: Types.ObjectId
  /* defaults */
  updatedAt: Date
  createdAt: Date
  active: boolean
}

export type TResetModel = Model<IResetPass, Record<string, unknown>>

/* endpoint dtos */
export type IResetPasswordBody = {
  email: string
}

export type IUpdatePasswordBody = {
  uuid: string
  newPassword: string
  confirmNewPassword: string
}