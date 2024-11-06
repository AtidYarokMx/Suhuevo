/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import shedService from '@services/shed.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* validation utils */
import { validateObjectId } from '@app/utils/validate.util'
/* dtos */
import { createShed, createShedBody, updateShed, updateShedBody } from '@app/dtos/shed.dto'

class ShedController {
  public async getOne(req: Request, res: Response) {
    const id = req.params.id
    try {
      validateObjectId(id)
      const response = await shedService.getOne(id)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getAll(req: Request, res: Response) {
    try {
      const response = await shedService.getAll()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create(req: Request, res: Response) {
    const body = req.body as createShedBody
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      createShed.parse(body)
      const response = await shedService.create(body, session)
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
    const body = req.body as updateShedBody
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      validateObjectId(id)
      updateShed.parse(body)
      const response = await shedService.update(id, body, session)
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

export const shedController: ShedController = new ShedController()
