/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import bonusService from '@services/bonus.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* dtos */
import { AppLocals } from '@app/interfaces/auth.dto'
import { ICreateBonus } from '@app/dtos/bonus.dto'

class BonusController {
  public async get(req: Request, res: Response) {
    try {
      const response = await bonusService.get()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async bulk(req: Request, res: Response) {
    const body = req.body as ICreateBonus[]
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await bonusService.bulk(body, session)
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

export const bonusController: BonusController = new BonusController()
