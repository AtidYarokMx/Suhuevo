import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { authenticateUser } from '@app/middlewares/auth.middleware'
/* controllers */
import { ruleController } from '@controllers/rule.controller'

class BonusRoutes extends ServerRouter {
  controller = ruleController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', authenticateUser, this.controller.get as RequestHandler)
    this.router.get('/:id', authenticateUser, this.controller.getByEmployee as RequestHandler)
    this.router.post('/', authenticateUser, this.controller.create as RequestHandler)
    this.router.put('/assign/:id', authenticateUser, this.controller.assign as RequestHandler)
    this.router.delete('/:idRule/unassign/:idEmployee', authenticateUser, this.controller.unassign as RequestHandler)
  }
}

const bonusRoutes: BonusRoutes = new BonusRoutes()
export default bonusRoutes.router
