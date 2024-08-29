import { type Types } from '@app/repositories/mongoose'

export interface ISessionClient {
  type: string
  name: string
  version: string
  short_name?: string
  engine?: string
  engine_version?: string
  family?: string
}

export interface ISessionOs {
  name?: string
  short_name?: string
  version?: string
  platform?: string
  family?: string
}

export interface ISessionDevice {
  id?: string
  type?: string
  brand?: string
  model?: string
}

export interface ISession {
  id: string
  refreshToken: string
  ipAddress: string
  expiryDate: Date
  /* required device info */
  client: ISessionClient
  /* non-required device info */
  os?: ISessionOs
  device?: ISessionDevice
  /* refs */
  user: Types.ObjectId
  /* defaults */
  createdAt: Date
  active: boolean
}
