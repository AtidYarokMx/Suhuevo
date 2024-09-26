import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { personalBonusController } from '@controllers/personal-bonus.controller'

class PersonalBonusRoutes extends ServerRouter {
  controller = personalBonusController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', adminMiddleware, this.controller.get as RequestHandler)
    this.router.get('/:id', adminMiddleware, this.controller.getByEmployee as RequestHandler)
    this.router.put('/', adminMiddleware, this.controller.bulk as RequestHandler)
  }
}

const personalBonusRoutes: PersonalBonusRoutes = new PersonalBonusRoutes()
export default personalBonusRoutes.router
