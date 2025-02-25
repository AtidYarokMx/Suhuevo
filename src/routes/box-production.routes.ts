import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { boxProductionController } from '@controllers/box-production.controller'

class BoxProductionRoutes extends ServerRouter {
  controller = boxProductionController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', adminMiddleware, this.controller.getAll as RequestHandler)
  }
}

const boxProductionRoutes: BoxProductionRoutes = new BoxProductionRoutes()
export default boxProductionRoutes.router
