/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import ruleService from '@services/rule.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* dtos */
import type { ICreateBody } from '@app/dtos/rule.dto'

class RuleController {
  public async create(req: Request, res: Response) {
    const body = req.body as ICreateBody
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await ruleService.create(body, session)
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

export const ruleController: RuleController = new RuleController()
