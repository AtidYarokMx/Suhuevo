import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { ruleController } from '@controllers/rule.controller'

class BonusRoutes extends ServerRouter {
  controller = ruleController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.post('/', adminMiddleware, this.controller.create as RequestHandler)
  }
}

const bonusRoutes: BonusRoutes = new BonusRoutes()
export default bonusRoutes.router
