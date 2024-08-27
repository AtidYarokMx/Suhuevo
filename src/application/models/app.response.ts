import { type Response } from 'express'
import { type AppErrorArgs } from './dtos/app-response.dto'

export type AppControllerResponse = Response<any, Record<string, any>>

export class AppResponse<T> {
  public message: string = 'success3'
  public code?: string | number
  public response?: T

  constructor (init?: Partial<AppResponse<T>>) {
    Object.assign(this, init)
  }
}

export class AppErrorResponse extends Error {
  public readonly name: string
  public readonly code: string
  public readonly message: string
  public readonly statusCode: number
  public readonly isOperational: boolean = true

  constructor (args: AppErrorArgs) {
    super(args.description)

    Object.setPrototypeOf(this, new.target.prototype)

    this.name = args.name ?? 'Error en la petición'
    this.message = args.message ?? args.name ?? 'Error en la petición'
    this.statusCode = args.statusCode
    this.code = 'err'

    if (args.isOperational !== undefined) {
      this.isOperational = args.isOperational
    }

    if (args.code !== undefined) {
      this.code = args.code
    }

    Error.captureStackTrace(this)
  }
}
