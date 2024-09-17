import { AppErrorResponse, AppResponse } from '@app/models/app.response'
import { TokenExpiredError } from 'jsonwebtoken'
import { MongooseError } from 'mongoose'

export interface IErrorHandlerResponse {
  statusCode: number
  error: unknown
  code?: string
  message?: string
}

export function appErrorResponseHandler (error: unknown | any): IErrorHandlerResponse {
  const result = new AppResponse()

  if (error instanceof MongooseError) {
    console.log('MONGOOO', error.name)
    return { statusCode: 400, code: error.name, error }
  }

  if (error instanceof AppErrorResponse) {
    result.message = error.message ?? 'Error del server'
    result.code = error.code ?? null
    console.log(result)
    return { statusCode: error.statusCode, error: result }
  }

  if (error instanceof TokenExpiredError) {
    return { statusCode: 401, code: 'ACCESS_TOKEN_EXPIRED', error }
  }

  result.message = String(error)
  console.log(error)
  return { statusCode: 500, error: result }
}
