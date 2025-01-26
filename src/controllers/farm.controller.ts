/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* services */
import farmService from '@services/farm.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* validate utils */
import { validateObjectId } from '@app/utils/validate.util'
/* dtos */
import { createFarm, createFarmBody, updateFarm, updateFarmBody } from '@app/dtos/farm.dto'

class FarmController {
  public async getOne(req: Request, res: Response) {
    const id = req.params.id
    try {
      validateObjectId(id)
      const response = await farmService.getOne(id)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const response = await farmService.getAll()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getOneWithSheds(req: Request, res: Response) {
    const id = req.params.id
    try {
      validateObjectId(id)
      const response = await farmService.getOneWithSheds(id)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAllWithSheds(req: Request, res: Response) {
    try {
      const response = await farmService.getAllWithSheds()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create(req: Request, res: Response) {
    const body = req.body as createFarmBody
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      createFarm.parse(body)
      const response = await farmService.create(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async update(req: Request, res: Response) {
    const id = req.params.id
    const body = req.body as updateFarmBody
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      validateObjectId(id)
      updateFarm.parse(body)
      const response = await farmService.update(id, body, session)
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

export const farmController: FarmController = new FarmController()
