/* lib */
import { z } from 'zod'
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* express */
import type { Request, Response } from 'express'
/* services */
import clientService from '@services/client.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* utils */
import { validateObjectId } from '@app/utils/validate.util'
/* dtos */
import { createClientBody, updateClientBody } from '@app/dtos/client.dto'
import { AppLocals } from '@app/interfaces/auth.dto'

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

  public async create(req: Request, res: Response) {
    const body = req.body as z.infer<typeof createClientBody>
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const validatedBody = createClientBody.parse(body)
      const response = await clientService.create(validatedBody, session, locals)
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
    const body = req.body as z.infer<typeof updateClientBody>
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      validateObjectId(id)
      const validatedBody = updateClientBody.parse(body)
      const response = await clientService.update(id, validatedBody, session, locals)
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

export const clientController: ClientController = new ClientController()
