import type { Request, Response } from 'express'
import { appErrorResponseHandler } from '@app/handlers/response/error.handler'
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
import payrollService from '../services/payroll.service'
/* dtos */
import { schemaGenerateWeeklyPayroll } from '@app/dtos/payroll.dto'

class PayrollController {

  // public async get (req: Request, res: Response): Promise<any> {
  //   const query = req.query
  //   try {
  //     const response = await departmentService.get(query)
  //     return res.status(200).json(response)
  //   } catch (error) {
  //     const { statusCode, error: err } = appErrorResponseHandler(error)
  //     return res.status(statusCode).json(err)
  //   }
  // }

  // public async create (req: Request, res: Response): Promise<any> {
  //   const body: any = req.body
  //   const session = await AppMainMongooseRepo.startSession()
  //   try {
  //     session.startTransaction()
  //     const response = await departmentService.create(body, session)
  //     await session.commitTransaction()
  //     await session.endSession()
  //     return res.status(200).json(response)
  //   } catch (error) {
  //     await session.abortTransaction()
  //     const { statusCode, error: err } = appErrorResponseHandler(error)
  //     return res.status(statusCode).json(err)
  //   }
  // }

  // public async update (req: Request, res: Response): Promise<any> {
  //   const body: any = req.body
  //   const session = await AppMainMongooseRepo.startSession()
  //   try {
  //     session.startTransaction()
  //     const response = await departmentService.update(body, session)
  //     await session.commitTransaction()
  //     await session.endSession()
  //     return res.status(200).json(response)
  //   } catch (error) {
  //     console.log(error)
  //     await session.abortTransaction()
  //     const { statusCode, error: err } = appErrorResponseHandler(error)
  //     return res.status(statusCode).json(err)
  //   }
  // }

  public async search(req: Request, res: Response): Promise<any> {
    const query = req.query
    try {
      const response = await payrollService.search(query)
      return res.status(200).json(response)
    } catch (error) {
      console.log(error)
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  //   public async create (req: Request, res: Response): Promise<any> {
  //   const body: any = req.body
  //   const session = await AppMainMongooseRepo.startSession()
  //   try {
  //     session.startTransaction()
  //     const response = await payrollService.executeWeeklyPayroll(body, session)
  //     await session.commitTransaction()
  //     await session.endSession()
  //     return res.status(200).json(response)
  //   } catch (error) {
  //     await session.abortTransaction()
  //     const { statusCode, error: err } = appErrorResponseHandler(error)
  //     return res.status(statusCode).json(err)
  //   }
  // }

  public async generateWeeklyPayroll(req: Request, res: Response): Promise<any> {
    const body = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      schemaGenerateWeeklyPayroll.parse(body)
      const response = await payrollService.generateWeeklyPayroll(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async executeWeeklyPayroll(req: Request, res: Response): Promise<any> {
    const body: any = req.body
    const session = await AppMainMongooseRepo.startSession()
    try {
      session.startTransaction()
      const response = await payrollService.executeWeeklyPayroll(body, session)
      await session.commitTransaction()
      await session.endSession()
      return res.status(200).json(response)
    } catch (error) {
      await session.abortTransaction()
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

  public async excelReport(req: Request, res: Response): Promise<any> {
    try {
      const query = req.query
      const result = await payrollService.excelReport(query)
      const file = result.file ?? null
      const fileName: string = result.fileName ?? ''
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="' + fileName + '"'
      })
      return res.status(200).send(file)
    } catch (error) {
      const { statusCode, error: err } = appErrorResponseHandler(error)
      return res.status(statusCode).json(err)
    }
  }

}

export const payrollController
  : PayrollController = new PayrollController()
