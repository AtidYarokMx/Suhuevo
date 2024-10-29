import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { payrollController } from '@controllers/payroll.controller'

class PayrollRoutes extends ServerRouter {
  controller = payrollController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    /* get */
    this.router.get('/search', [adminMiddleware], this.controller.search as RequestHandler)
    this.router.get('/export-excel', [adminMiddleware], this.controller.excelReport as RequestHandler)
    /* post */
    this.router.post('/generate-payroll', [adminMiddleware], this.controller.generateWeeklyPayroll as RequestHandler)
    this.router.post('/execute-payroll', [adminMiddleware], this.controller.executeWeeklyPayroll as RequestHandler)

  }
}

const payrollRoutes: PayrollRoutes = new PayrollRoutes()
export default payrollRoutes.router
