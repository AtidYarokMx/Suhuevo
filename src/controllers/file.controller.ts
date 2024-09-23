/* express */
import type { Request, Response } from 'express'
/* repos */
import { AppMongooseRepo } from '@app/repositories/mongoose'
/* services */
import fileService from '@services/file.service'
/* handlers */
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
/* dtos */
import { AppLocals } from '@app/interfaces/auth.dto'

class FileController {
  public async uploadSingle(req: Request, res: Response): Promise<any> {
    const body = req.file
    const locals = res.locals as AppLocals
    const session = await AppMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await fileService.uploadSingle(body, locals, session)
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

export const fileController: FileController = new FileController()
