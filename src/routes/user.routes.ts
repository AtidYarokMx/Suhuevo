import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { userController } from '@controllers/user.controller'
import { adminMiddleware } from '@app/middlewares/auth.middleware'

class UserRoutes extends ServerRouter {
  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/ping', (_req: any, res: any) => { res.json({ ok: true }) })

    this.router.get('/users', adminMiddleware as RequestHandler, userController.getUsers as RequestHandler)
    this.router.get('/user', userController.getUser as RequestHandler)
    this.router.get('/search', userController.getUser as RequestHandler)

    this.router.post('/create', userController.create as RequestHandler)

    this.router.patch('/updateUser', adminMiddleware as RequestHandler, userController.updateUser as RequestHandler)
  }
}

const userRoutes: UserRoutes = new UserRoutes()
export default userRoutes.router
