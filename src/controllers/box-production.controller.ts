/* lib */
import { z } from 'zod'
/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* services */
import boxProductionService from '@services/box-production.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* param validations */
import { validateBarcode } from '@app/utils/validate.util'
/* dtos */
import { sendBoxesToSellsBody } from '@app/dtos/box-production.dto'
import { AppLocals } from '@app/interfaces/auth.dto'

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

  public async sendBoxesToSells(req: Request, res: Response) {
    const body = req.body as z.infer<typeof sendBoxesToSellsBody>
    console.log(body)
    const locals = res.locals as AppLocals
    const session = await AppMainMongooseRepo.startSession()
    try {
      const validatedBody = sendBoxesToSellsBody.parse(body)
      const response = await boxProductionService.sendBoxesToSells(validatedBody, session, locals)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async synchronize(req: Request, res: Response) {
    try {
      const response = await boxProductionService.synchronize()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const boxProductionController: BoxProductionController = new BoxProductionController()
