/* express */
import type { Request, Response } from 'express'
/* services */
import clientService from '@services/client.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* validation utils */
import { validateObjectId } from '@app/utils/validate.util'

class ClientController {
  public async getOne(req: Request, res: Response) {
    const id = req.params.id
    try {
      validateObjectId(id)
      const response = await clientService.getOne(id)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const response = await clientService.getAll()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const clientController: ClientController = new ClientController()
