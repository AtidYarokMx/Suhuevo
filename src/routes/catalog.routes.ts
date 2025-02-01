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
    /* personal bonus */
    this.router.get('/personal-bonus', adminMiddleware, this.controller.getPersonalBonus as RequestHandler)
    this.router.put('/personal-bonus', adminMiddleware, this.controller.bulkPersonalBonus as RequestHandler)
    this.router.post('/personal-bonus', adminMiddleware, this.controller.createPersonalBonus as RequestHandler)
    /* rules */
    this.router.get('/rule', adminMiddleware, this.controller.getRules as RequestHandler)
    this.router.put('/rule', adminMiddleware, this.controller.bulkCatalogRule as RequestHandler)
    this.router.post('/rule', adminMiddleware, this.controller.createCatalogRule as RequestHandler)
    /* egg type catalog */
    this.router.post('/egg', adminMiddleware, this.controller.createCatalogEggType as RequestHandler)
    /* payment methods */
    this.router.get('/payment-method', adminMiddleware, this.controller.getPaymentMethods as RequestHandler)
    this.router.post('/payment-method', adminMiddleware, this.controller.createPaymentMethod as RequestHandler)
    /* tipos de caja de huevo */
    this.router.get('/box', adminMiddleware, this.controller.getBoxTypes as RequestHandler)
    this.router.post('/box', adminMiddleware, this.controller.createBoxType as RequestHandler)
  }
}

const catalogRoutes: CatalogRoutes = new CatalogRoutes()
export default catalogRoutes.router
