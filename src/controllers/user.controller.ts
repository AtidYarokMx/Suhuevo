import type { Request, Response } from 'express'
import { AppMongooseRepo } from '@app/repositories/mongoose'
import userService from '../services/user.service'
import type { AppControllerResponse } from '@app/models/app.response'
import { appSuccessResponseHandler } from '@app/handlers/response/success.handler'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'

class UserController {
  public async getUser (req: Request, res: Response): Promise<AppControllerResponse> {
    const id: string = req.body?.id
    try {
      const response = await userService.getUser(id)
      const result = appSuccessResponseHandler('success3', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getUsers (req: Request, res: Response): Promise<AppControllerResponse> {
    const ids = req.query.ids as string[]
    try {
      const response = await userService.getUsers(ids)
      const result = appSuccessResponseHandler('success3', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async searchUser (req: Request, res: Response): Promise<AppControllerResponse> {
    const fieldName: string = req.body?.fieldName
    const value: string = req.body?.value
    const operator: string = req.body?.operator

    try {
      const response = await userService.searchUser(value, fieldName, operator)
      const result = appSuccessResponseHandler('success3', response)
      return res.status(200).json(result)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create (req: Request, res: Response): Promise<AppControllerResponse> {
    const body: any = req.body
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await userService.create(body, session)
      await session.commitTransaction()
      await session.endSession()
      const result = appSuccessResponseHandler('success3', response)
      return res.status(200).json(result)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async updateUser (req: Request, res: Response): Promise<AppControllerResponse> {
    const body: any = req.body.user
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await userService.update(body, session)
      await session.commitTransaction()
      await session.endSession()
      const result = appSuccessResponseHandler('success3', response)
      return res.status(200).json(result)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const userController: UserController = new UserController()
