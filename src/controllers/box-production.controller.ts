/* express */
import type { Request, Response } from 'express'
/* services */
import boxProductionService from '@services/box-production.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* param validations */
import { validateBarcode } from '@app/utils/validate.util'

class BoxProductionController {
  public async getOne(req: Request, res: Response) {
    const code = req.params.code
    try {
      const validatedCode = validateBarcode(code)
      const response = await boxProductionService.getOne(validatedCode)
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
