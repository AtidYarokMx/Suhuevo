import type { Request, Response } from 'express'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
import selectService from '../services/select.service'

class SelectController {
  public async get (req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      const response = await selectService.get(query)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const selectController: SelectController = new SelectController()
