import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { catalogController } from '@controllers/catalog.controller'

class CatalogRoutes extends ServerRouter {
  controller = catalogController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/personal-bonus', adminMiddleware, this.controller.getPersonalBonus as RequestHandler)
    this.router.put('/personal-bonus', adminMiddleware, this.controller.bulkPersonalBonus as RequestHandler)
    this.router.post('/personal-bonus', adminMiddleware, this.controller.createPersonalBonus as RequestHandler)
  }
}

const catalogRoutes: CatalogRoutes = new CatalogRoutes()
export default catalogRoutes.router
