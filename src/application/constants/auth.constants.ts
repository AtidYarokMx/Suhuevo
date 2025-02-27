/* rounds for password */
export const rounds: number = 10

/* expiration for refresh token */
export const refreshExpiresIn: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

/* rate limit time */
export const rateLimitTime: number = 30 * 60 * 1000 // 30 mins

/* max login attempts */
export const maxLoginAttempts: number = 4
