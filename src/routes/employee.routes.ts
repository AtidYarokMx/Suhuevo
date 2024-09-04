import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { employeeController } from '@controllers/employee.controller'

class EmployeeRoutes extends ServerRouter {
  controller = employeeController

  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/', [adminMiddleware], this.controller.get as RequestHandler)
    this.router.post('/create', [adminMiddleware], this.controller.create as RequestHandler)
    this.router.patch('/update', [adminMiddleware], this.controller.update as RequestHandler)
    this.router.get('/search', [adminMiddleware], this.controller.search as RequestHandler)
  }
}

const employeeRoutes: EmployeeRoutes = new EmployeeRoutes()
export default employeeRoutes.router
