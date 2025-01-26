import type { Request, Response } from 'express'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
import employeeService from '../services/employee.service'

class EmployeeController {
  public async get(req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      const response = await employeeService.get(query)
      return res.status(200).json(response)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async create(req: Request, res: Response): Promise<any> {
    const body: any = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await employeeService.create(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async update(req: Request, res: Response): Promise<any> {
    const body: any = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await employeeService.update(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      console.log(error)
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async search(req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      const response = await employeeService.search(query)
      return res.status(200).json(response)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }
}

export const employeeController: EmployeeController = new EmployeeController()
