import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { uploadFileMiddleware } from '@app/middlewares/upload.middleware'
import { overtimeController } from '@controllers/overtime.controller'


class OvertimeRoutes extends ServerRouter {
  controller = overtimeController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', [adminMiddleware], this.controller.get as RequestHandler)
    this.router.post('/create', [adminMiddleware], this.controller.create as RequestHandler)
    this.router.patch('/update', [adminMiddleware], this.controller.update as RequestHandler)
    this.router.get('/search', [adminMiddleware], this.controller.search as RequestHandler)
  }
}

const overtimeRoutes: OvertimeRoutes = new OvertimeRoutes()
export default overtimeRoutes.router
