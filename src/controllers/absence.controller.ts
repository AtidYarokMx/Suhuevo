import type { Request, Response } from 'express'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
import absenceService from '../services/absence.service'

class AbsenceController {

  public async get(req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      const response = await absenceService.get(query)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async search(req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      const response = await absenceService.search(query)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async update(req: Request, res: Response): Promise<any> {
    const body: any = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await absenceService.update(body, session)
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

  public async generateDailyAbsences(req: Request, res: Response): Promise<any> {
    const body: any = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await absenceService.generateDailyAbsences(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

}

export const absenceController: AbsenceController = new AbsenceController()
