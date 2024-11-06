import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { shedController } from '@controllers/shed.controller'

class ShedRoutes extends ServerRouter {
  controller = shedController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', adminMiddleware, this.controller.getAll as RequestHandler)
    this.router.get('/:id', adminMiddleware, this.controller.getOne as RequestHandler)
    this.router.post('/', adminMiddleware, this.controller.create as RequestHandler)
    this.router.put('/:id', adminMiddleware, this.controller.update as RequestHandler)
  }
}

const shedRoutes: ShedRoutes = new ShedRoutes()
export default shedRoutes.router
