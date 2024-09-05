import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { departmentController } from '@controllers/deparment.controller'

class DepartmentRoutes extends ServerRouter {
  controller = departmentController

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

const deparmentRoutes: DepartmentRoutes = new DepartmentRoutes()
export default deparmentRoutes.router
