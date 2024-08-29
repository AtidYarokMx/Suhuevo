import { type Types } from 'mongoose'

export enum EUserRoles {
  AGGREGATOR = 1,
  MORAL = 2,
  PHYSICAL = 3,
}

export enum EAuthAttemptErrors {
  INVALID_PASSWORD_FORMAT = 'La contraseña no contiene cumple con las siguientes reglas: [1 mayúscula, 1 minúscula, 1 símbolo, mínimo de 8 caractéres]',
  MAX_LOGIN_ATTEMPTS = 'Has intentado iniciar sesión varias veces. Prueba nuevamente en 30 minutos.',
}

export interface IRefreshToken {
  refreshToken: string
  expiryDate: Date
}

export interface IAccountToken {
  token: string
  expiresIn: number
}

export interface IBackofficeUserPayload {
  _id: Types.ObjectId
  id: string
  name: string
  firstLastName: string
  email: string
  role: number
  /* non-required */
  secondLastName?: string
  phone?: string
  /* media */
  avatar?: string
}
