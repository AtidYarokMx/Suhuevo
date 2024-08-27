import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
// import { v4 as uuidv4 } from 'uuid'
/* consts */
import { rounds, expiresIn } from '@app/constants/auth.constants'
/* dtos */
import { type IAccountToken } from '@app/interfaces/auth.dto'

export function generatePasswordHash (password: string): string {
  const salt: string = bcrypt.genSaltSync(rounds)
  const hash: string = bcrypt.hashSync(password, salt)
  return hash
}

export function comparePassword (password: string, hashPassword: string): boolean {
  return bcrypt.compareSync(password, hashPassword)
}

export function generateUserToken (payload: any): IAccountToken {
  const token: string = jwt.sign(payload, process.env.USER_JWT_SIGNATURE ?? '', { expiresIn })
  return { token, expiresIn }
}

export function verifyUserToken<T> (token: string): T {
  return jwt.verify(token, process.env.USER_JWT_SIGNATURE ?? '') as T
}

// export async function generateApiKey (): Promise<{ apiKey: string, hashedApiKey: string }> {
//   // Generar API Key
//   const uuid: string = uuidv4()
//   const apiKey = 'api-' + uuid + '-' + Math.random().toString(36).substring(2, 8)
//   // Hashear y encriptar la API Key
//   const salt: string = bcrypt.genSaltSync(5)
//   const hashedApiKey = bcrypt.hashSync(apiKey, salt)
//   return { apiKey, hashedApiKey }
// }

// export function compareApiKey (apiKey: string, hashedApiKey: string): boolean {
//   return bcrypt.compareSync(apiKey, hashedApiKey)
// }
