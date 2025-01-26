/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* services */
import ruleService from '@services/rule.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* dtos */
import type { ICreateBody, IUpdateBody } from '@app/dtos/rule.dto'

class RuleController {
  public async get(req: Request, res: Response) {
    try {
      const response = await ruleService.get()
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async getByEmployee(req: Request, res: Response) {
    const id = req.params.id as string
    try {
      const response = await ruleService.getByEmployee(id)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create(req: Request, res: Response) {
    const body = req.body as ICreateBody
    const session = await AppMainMongooseRepo.startSession()
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

  public async assign(req: Request, res: Response) {
    const body = req.body as IUpdateBody[]
    const idEmployee = req.params.id as string
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await ruleService.assign(body, idEmployee, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async unassign(req: Request, res: Response) {
    const idRule = req.params.idRule as string
    const idEmployee = req.params.idEmployee as string
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await ruleService.unassign(idRule, idEmployee, session)
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
