import { Types } from "mongoose"

export interface IUser {
  _id: Types.ObjectId
  id: string
  name: string
  firstLastName: string
  secondLastName: string
  role: string

  userName: string
  phone: string
  email: string

  password: string
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export interface IUserMethods {
  fullname: () => string
}
