import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { payrollController } from '@controllers/payroll.controller'

class PayrollRoutes extends ServerRouter {
  controller = payrollController

  constructor () {
    super()
    this.config()
  }

  config (): void {
    // this.router.get('/'/*, [adminMiddleware]*/, this.controller.get as RequestHandler)
    // this.router.post('/create'/*, [adminMiddleware]*/, this.controller.create as RequestHandler)
    // this.router.patch('/update'/*, [adminMiddleware]*/, this.controller.update as RequestHandler)
    this.router.get('/search'/*, [adminMiddleware]*/, this.controller.search as RequestHandler)

    this.router.post('/execute-payroll'/*, [adminMiddleware]*/, this.controller.executeWeeklyPayroll as RequestHandler)
    this.router.get('/export-excel'/*, [adminMiddleware]*/, this.controller.excelReport as RequestHandler)

  }
}

const payrollRoutes: PayrollRoutes = new PayrollRoutes()
export default payrollRoutes.router
