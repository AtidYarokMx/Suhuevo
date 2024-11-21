/* express */
import type { Request, Response } from 'express'
/* services */
import boxProductionService from '@services/box-production.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'

class BoxProductionController {
  public async getOne(req: Request, res: Response) {
    const id = req.params.id
    try {
      // validateObjectId(id)
      const response = await boxProductionService.getAll()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const response = await boxProductionService.getAll()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const boxProductionController: BoxProductionController = new BoxProductionController()
