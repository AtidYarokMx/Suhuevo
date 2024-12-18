/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import inventoryService from '@services/inventory.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* validate utils */
import { validateObjectId } from '@app/utils/validate.util'
/* dtos */
import { createInventory, updateInventoryBody, type createInventoryBody } from '@app/dtos/inventory.dto'

class InventoryController {
  public async getOne(req: Request, res: Response) {
    const id = req.params.id
    try {
      validateObjectId(id)
      const response = await inventoryService.getOne(id)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const response = await inventoryService.getAll()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create(req: Request, res: Response) {
    const body = req.body as createInventoryBody
    try {
      const parsedBody = createInventory.parse(body)
      const response = await inventoryService.create(parsedBody)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async update(req: Request, res: Response) {
    const id = req.params.id
    const body = req.body as updateInventoryBody
    const session = await AppMongooseRepo.startSession()
    try {
      validateObjectId(id)
      const parsedBody = createInventory.parse(body)
      const response = await inventoryService.update(id, parsedBody, session)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const inventoryController: InventoryController = new InventoryController()
