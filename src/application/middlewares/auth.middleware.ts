import { type Request, type Response, type NextFunction } from 'express'
/* handlers */
/* models */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { verifyUserToken } from '@app/utils/auth.util'
/* dtos */
import { type IBackofficeUserPayload } from '@app/interfaces/auth.dto'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'

export async function adminMiddleware (req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // console.log(req.headers)
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.split?.(' ')?.[1] ?? false

    if (typeof sessionToken === 'undefined' || sessionToken === false || sessionToken.trim() === '') throw new AppErrorResponse({ statusCode: 401, name: 'Se requiere un token de acceso válido', isOperational: true })

    const verified = verifyUserToken<IBackofficeUserPayload>(sessionToken)
    res.locals.user = verified
    next()
  } catch (error) {
    console.log(error)
    const { statusCode, error: err } = appErrorResponseHandler(error)
    res.status(statusCode).json({ error: err })
  }
}
