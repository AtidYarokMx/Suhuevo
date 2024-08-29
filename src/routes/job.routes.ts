import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { jobController } from '@controllers/job.controller'

class JobRoutes extends ServerRouter {
  controller = jobController

  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/'/*, [adminMiddleware]*/, this.controller.get as RequestHandler)
    this.router.post('/create'/*, [adminMiddleware]*/, this.controller.create as RequestHandler)
    this.router.patch('/update'/*, [adminMiddleware]*/, this.controller.update as RequestHandler)
    this.router.get('/search'/*, [adminMiddleware]*/, this.controller.search as RequestHandler)
  }
}

const jobRoutes: JobRoutes = new JobRoutes()
export default jobRoutes.router
