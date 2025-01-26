import type { Request, Response } from 'express'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
import scheduleExceptionService from '../services/schedule-exception.service'

class ScheduleExceptionController {
  public async get(req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      const response = await scheduleExceptionService.get(query)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create(req: Request, res: Response): Promise<any> {
    const body: any = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await scheduleExceptionService.create(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      console.log(error)
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async update(req: Request, res: Response): Promise<any> {
    const body: any = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await scheduleExceptionService.update(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      console.log(error)
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async search(req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      const response = await scheduleExceptionService.search(query)
      return res.status(200).json(response)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async updateByEmployee(req: Request, res: Response): Promise<any> {
    const body: any = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await scheduleExceptionService.updateByEmployee(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      console.log(error)
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const scheduleExceptionController: ScheduleExceptionController = new ScheduleExceptionController()
