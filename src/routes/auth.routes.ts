import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
/* controllers */
import { authController } from '@controllers/auth.controller'
/* middlewares */
// import { maxLoginAttempts } from '@app/middlewares/rate-limit.middleware'

class AuthRoutes extends ServerRouter {
  constructor() {
    super()
    this.config()
  }

  config(): void {
    // this.router.post('/create', authController.createUser as RequestHandler)
    this.router.post('/login', authController.login as RequestHandler)
    this.router.post('/reset-password', authController.resetPassword as RequestHandler)
  }
}

const authRoutes: AuthRoutes = new AuthRoutes()
export default authRoutes.router
