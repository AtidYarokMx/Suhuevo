/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import holidayService from '@services/holiday.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* dtos */
import { AppLocals } from '@app/interfaces/auth.dto'
import { ICreateBody } from '@app/dtos/holiday.dto'

class HolidayController {
  public async create(req: Request, res: Response): Promise<any> {
    const body = req.body as ICreateBody
    const locals = res.locals as AppLocals
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await holidayService.create(body, locals, session)
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

export const holidayController: HolidayController = new HolidayController()
