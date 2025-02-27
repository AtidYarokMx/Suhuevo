import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { authenticateUser } from '@app/middlewares/auth.middleware'
/* controllers */
import { inventoryController } from '@controllers/inventory.controller'

class InventoryRoutes extends ServerRouter {
  controller = inventoryController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', authenticateUser, this.controller.getAll as RequestHandler)
    this.router.get('/shed/:shed', authenticateUser, this.controller.getAllFromShed as RequestHandler)
    this.router.get('/farm/:farm/report', authenticateUser, this.controller.reportFromFarm as RequestHandler)
    this.router.get('/shed/:shed/report', authenticateUser, this.controller.reportFromShed as RequestHandler)
    this.router.get('/:id', authenticateUser, this.controller.getOne as RequestHandler)
    this.router.get('/:id/shed/:shed', authenticateUser, this.controller.getOneFromShed as RequestHandler)
    this.router.post('/', authenticateUser, this.controller.create as RequestHandler)
    this.router.patch('/:id', authenticateUser, this.controller.update as RequestHandler)

  }
}

const inventoryRoutes: InventoryRoutes = new InventoryRoutes()
export default inventoryRoutes.router
