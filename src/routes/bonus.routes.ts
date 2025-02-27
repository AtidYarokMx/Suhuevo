import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { authenticateUser } from '@app/middlewares/auth.middleware'
/* controllers */
import { bonusController } from '@controllers/bonus.controller'

class BonusRoutes extends ServerRouter {
  controller = bonusController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', authenticateUser, this.controller.get as RequestHandler)
    this.router.put('/', authenticateUser, this.controller.bulk as RequestHandler)
  }
}

const bonusRoutes: BonusRoutes = new BonusRoutes()
export default bonusRoutes.router
