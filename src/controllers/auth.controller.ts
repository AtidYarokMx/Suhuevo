import type { Request, Response } from 'express'
import { AppMongooseRepo } from '@app/repositories/mongoose'
import authService from '../services/auth.service'
import type { AppControllerResponse } from '@app/models/app.response'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'

class AuthController {
  // public async createUser (req: Request, res: Response): Promise<AppControllerResponse> {
  //   const body = req.body
  //   const locals = res.locals
  //   const session = await AppMongooseRepo.startSession()

  //   try {
  //     session.startTransaction()
  //     const response = await authService.createUser(body, locals, session)
  //     await session.commitTransaction()
  //     await session.endSession()
  //     const result = appSuccessResponseHandler('success3', response)
  //     return res
  //       .cookie('session', response.token, { ...cookieOptions, domain: req.hostname })
  //       .cookie('refresh-token', response.refreshToken, { ...refreshCookieOptions, domain: req.hostname })
  //       .status(200)
  //       .json(result)
  //   } catch (error) {
  //     await session.abortTransaction()
  //     const { statusCode, error: err } = appErrorResponseHandler(error)
  //     return res.status(statusCode).json(err)
  //   }
  // }

  public async login (req: Request, res: Response): Promise<AppControllerResponse> {
    const body = req.body
    const locals = res.locals
    const session = await AppMongooseRepo.startSession()

    try {
      session.startTransaction()
      const response = await authService.login(body, locals, session)
      await session.commitTransaction()
      await session.endSession()
      // const result = appSuccessResponseHandler('success3', response)
      return res
        // .cookie('XSRF-TOKEN', req.csrfToken(), { httpOnly: false, secure: true })
        .status(200).json(response)
    } catch (error) {
      console.log(error)
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  // public async refreshToken (req: Request, res: Response): Promise<AppControllerResponse> {
  //   const token = req.headers?.['x-refresh-token'] as string

  //   try {
  //     const response = await authService.refreshToken(token)
  //     const result = appSuccessResponseHandler('success3', response)
  //     return res
  //       .cookie('session', response.token, cookieOptions)
  //       .cookie('refresh-token', response.refreshToken, refreshCookieOptions)
  //       .status(200)
  //       .json(result)
  //   } catch (error) {
  //     const { statusCode, error: err } = appErrorResponseHandler(error)
  //     return res.status(statusCode).json(err)
  //   }
  // }
}

export const authController: AuthController = new AuthController()
