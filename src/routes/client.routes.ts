import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { clientController } from '@controllers/client.controller'

class ClientRoutes extends ServerRouter {
  controller = clientController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', adminMiddleware, this.controller.getAll as RequestHandler)
    this.router.get('/:id', adminMiddleware, this.controller.getOne as RequestHandler)
  }
}

const clientRoutes: ClientRoutes = new ClientRoutes()
export default clientRoutes.router
