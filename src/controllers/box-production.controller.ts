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
import { customLog } from '@app/utils/util.util'

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

  public async getEggTypeSummaryFromBoxes(req: Request, res: Response) {
    customLog("Query Params:", req.query);
    try {
      // Extrae filtros sin validarlos con sendBoxesToSellsBody
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        farmNumber: req.query.farmNumber ? Number(req.query.farmNumber) : undefined,
        shedNumber: req.query.shedNumber ? Number(req.query.shedNumber) : undefined,
        status: req.query.status ? Number(req.query.status) : undefined,
      };

      const summary = await boxProductionService.getEggTypeSummaryFromBoxes(filters);
      return res.status(200).json({ data: summary });
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error);
      return res.status(statusCode).json(err);
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
