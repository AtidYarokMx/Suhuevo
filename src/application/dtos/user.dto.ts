import { Model } from "@app/repositories/mongoose"
import { Types } from "mongoose"

export type IUser = {
  _id: Types.ObjectId
  id: string
  name: string
  firstLastName: string
  secondLastName: string
  roleId: Types.ObjectId

  userName: string
  phone: string
  email: string

  password: string
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export type IUserVirtuals = {
  fullname: string
}

export type AppUserModel = Model<IUser, {}, {}, IUserVirtuals>