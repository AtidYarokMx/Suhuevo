import { type Request, type Response, type NextFunction } from 'express'
/* handlers */
/* models */
import { AppErrorResponse } from '@app/models/app.response'
/* utils */
import { verifyUserToken } from '@app/utils/auth.util'
/* dtos */
import { IUserPayload } from '@app/interfaces/auth.dto'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
import { hasPermission } from '@app/constants/permissions'

export async function adminMiddleware (req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // console.log(req.headers)
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.split?.(' ')?.[1] ?? false

    if (typeof sessionToken === 'undefined' || sessionToken === false || sessionToken.trim() === '') throw new AppErrorResponse({ statusCode: 401, name: 'Se requiere un token de acceso válido', isOperational: true })

    const verified = verifyUserToken<IUserPayload>(sessionToken)
    res.locals.user = verified

    console.log('PATH', req.originalUrl);

    // Verificar los permisos utilizando la función hasPermission
    if (!hasPermission(verified.role, req.originalUrl)) {
      throw new AppErrorResponse({ statusCode: 403, name: 'No tiene permiso para acceder a esta ruta', isOperational: true });
    }

    next()
  } catch (error) {
    // console.log(error)
    const { statusCode, error: err } = appErrorResponseHandler(error)
    res.status(statusCode).json({ error: err })
  }
}
