import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { selectController } from '@controllers/select.controller'
import { authenticateUser } from '@app/middlewares/auth.middleware'

class SelectRoutes extends ServerRouter {
  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', [authenticateUser], selectController.get as RequestHandler)
    // this.router.get('/search', [authenticateUser], selectController.search as RequestHandler)
  }
}

const selectRoutes: SelectRoutes = new SelectRoutes()
export default selectRoutes.router
