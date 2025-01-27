/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* services */
import inventoryService from '@services/inventory.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* validate utils */
import { validateObjectId } from '@app/utils/validate.util'
/* dtos */
import { createInventory, updateInventoryBody, type createInventoryBody } from '@app/dtos/inventory.dto'
import { AppLocals } from '@app/interfaces/auth.dto'

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

  public async getOneFromShed(req: Request, res: Response) {
    const id = req.params.id
    const idShed = req.params.shed
    try {
      validateObjectId(idShed)
      const response = await inventoryService.getOneFromShed(id, idShed)
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

  public async getAllFromShed(req: Request, res: Response) {
    const idShed = req.params.shed
    try {
      validateObjectId(idShed)
      const response = await inventoryService.getAllFromShed(idShed)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create(req: Request, res: Response) {
    const body = req.body as createInventoryBody
    const locals = res.locals as AppLocals
    try {
      const parsedBody = createInventory.parse(body)
      const response = await inventoryService.create(parsedBody, locals)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async update(req: Request, res: Response) {
    const id = req.params.id
    const body = req.body as updateInventoryBody
    const session = await AppMainMongooseRepo.startSession()
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

  public async reportFromFarm(req: Request, res: Response) {
    const farmId = req.params.farm
    try {
      validateObjectId(farmId)
      const response = await inventoryService.reportFromFarm(farmId)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async reportFromShed(req: Request, res: Response) {
    const shedId = req.params.shed
    try {
      validateObjectId(shedId)
      const response = await inventoryService.reportFromShed(shedId)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const inventoryController: InventoryController = new InventoryController()
