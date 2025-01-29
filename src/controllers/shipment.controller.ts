/* express */
import type { Request, Response } from 'express'
/* services */
import shipmentService from '@services/shipment.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* validation utils */
import { validateObjectId } from '@app/utils/validate.util'

class ShipmentController {
  public async getOne(req: Request, res: Response) {
    const id = req.params.id
    try {
      validateObjectId(id)
      const response = await shipmentService.getOne(id)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const response = await shipmentService.getAll()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const shipmentController: ShipmentController = new ShipmentController()
