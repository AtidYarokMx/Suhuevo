import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { inventoryController } from '@controllers/inventory.controller'

class InventoryRoutes extends ServerRouter {
  controller = inventoryController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', adminMiddleware, this.controller.getAll as RequestHandler)
    this.router.get('/shed/:shed', adminMiddleware, this.controller.getAllFromShed as RequestHandler)
    this.router.get('/farm/:farm/report', adminMiddleware, this.controller.reportFromFarm as RequestHandler)
    this.router.get('/shed/:shed/report', adminMiddleware, this.controller.reportFromShed as RequestHandler)
    this.router.get('/:id', adminMiddleware, this.controller.getOne as RequestHandler)
    this.router.get('/:id/shed/:shed', adminMiddleware, this.controller.getOneFromShed as RequestHandler)
    this.router.post('/', adminMiddleware, this.controller.create as RequestHandler)
    this.router.patch('/:id', adminMiddleware, this.controller.update as RequestHandler)
  }
}

const inventoryRoutes: InventoryRoutes = new InventoryRoutes()
export default inventoryRoutes.router
