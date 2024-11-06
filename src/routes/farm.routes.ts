import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { farmController } from '@controllers/farm.controller'

class FarmRoutes extends ServerRouter {
  controller = farmController

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

const farmRoutes: FarmRoutes = new FarmRoutes()
export default farmRoutes.router
