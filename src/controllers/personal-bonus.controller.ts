/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* services */
import personalBonusService from '@services/personal-bonus.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* dtos */
import { ICreatePersonalBonus } from '@app/dtos/personal-bonus.dto'

class PersonalBonusController {
  public async get(req: Request, res: Response) {
    try {
      const response = await personalBonusService.get()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getByEmployee(req: Request, res: Response) {
    const id = req.params.id
    try {
      const response = await personalBonusService.getByEmployee(id)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async bulk(req: Request, res: Response) {
    const id = req.params.id
    const body = req.body as ICreatePersonalBonus[]
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await personalBonusService.bulk(body, id, session)
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

export const personalBonusController: PersonalBonusController = new PersonalBonusController()
