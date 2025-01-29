import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { shipmentController } from '@controllers/shipment.controller'

class ShipmentRoutes extends ServerRouter {
  controller = shipmentController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', adminMiddleware, this.controller.getAll as RequestHandler)
    this.router.get('/:id', adminMiddleware, this.controller.getOne as RequestHandler)
  }
}

const shipmentRoutes: ShipmentRoutes = new ShipmentRoutes()
export default shipmentRoutes.router
