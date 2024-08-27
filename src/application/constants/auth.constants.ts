import type { CookieOptions } from 'express'

/* rounds for password */
export const rounds: number = 10

/* expiration for jwt */
export const expiresIn: number = 60 * 60 * 24 * 30

/* expiration for refresh token */
export const refreshExpiresIn: number = 60 * 60 * 24

/* rate limit time */
export const rateLimitTime: number = 30 * 60 * 1000 // 30 mins

/* max login attempts */
export const maxLoginAttempts: number = 4

/* password regex */
export const passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/

/* jwt cookie options */
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,
  path: '/api',
  maxAge: expiresIn * 1000
}

/* refresh token cookie options */
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,
  path: '/api',
  maxAge: refreshExpiresIn * 1000
}
