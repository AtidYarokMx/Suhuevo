import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { authenticateUser } from '@app/middlewares/auth.middleware'
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
    this.router.get('/personal-bonus', authenticateUser, this.controller.getPersonalBonus as RequestHandler)
    this.router.put('/personal-bonus', authenticateUser, this.controller.bulkPersonalBonus as RequestHandler)
    this.router.post('/personal-bonus', authenticateUser, this.controller.createPersonalBonus as RequestHandler)
    /* rules */
    this.router.get('/rule', authenticateUser, this.controller.getRules as RequestHandler)
    this.router.put('/rule', authenticateUser, this.controller.bulkCatalogRule as RequestHandler)
    this.router.post('/rule', authenticateUser, this.controller.createCatalogRule as RequestHandler)
    /* egg type catalog */
    this.router.post('/egg', authenticateUser, this.controller.createCatalogEggType as RequestHandler)
    /* payment methods */
    this.router.get('/payment-method', authenticateUser, this.controller.getPaymentMethods as RequestHandler)
    this.router.post('/payment-method', authenticateUser, this.controller.createPaymentMethod as RequestHandler)
    /* tipos de caja de huevo */
    this.router.get('/box', authenticateUser, this.controller.getBoxTypes as RequestHandler)
    this.router.post('/box', authenticateUser, this.controller.createBoxType as RequestHandler)
  }
}

const catalogRoutes: CatalogRoutes = new CatalogRoutes()
export default catalogRoutes.router
