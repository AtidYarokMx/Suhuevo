import rateLimit from 'express-rate-limit'
/* conts */
import { rateLimitTime as windowMs, maxLoginAttempts as max } from '@app/constants/auth.constants'
/* handlers */
import { SessionLogger } from '@app/handlers/loggers/session.logger'
/* dtos */
import { EAuthAttemptErrors } from '@app/interfaces/auth.dto'

export const maxLoginAttempts = rateLimit({
  windowMs,
  max,
  message: EAuthAttemptErrors.MAX_LOGIN_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: function (req, res, next) {
    SessionLogger.warn(`Intento fallido de inicio de sesión desde la IP: ${res.locals.ipAddress as string}`)
    return res.status(429).send('Muchos intentos fallidos de inicio de sesión. Intenta nuevamente en 30 minutos.')
  }
})
