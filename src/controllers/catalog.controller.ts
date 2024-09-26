/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import catalogService from '@services/catalog.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* dtos */
import { ICreateCatalogPersonalBonus } from '@app/dtos/catalog-personal-bonus.dto'

class CatalogController {
  public async getPersonalBonus(req: Request, res: Response) {
    try {
      const response = await catalogService.getPersonalBonus()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async createPersonalBonus(req: Request, res: Response) {
    const body = req.body as ICreateCatalogPersonalBonus[]
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await catalogService.createPersonalBonus(body, session)
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

export const catalogController: CatalogController = new CatalogController()
