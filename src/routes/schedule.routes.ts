import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { scheduleExceptionController } from '@controllers/schedule-exception.controller'

class ScheduleRoutes extends ServerRouter {
  controller = scheduleExceptionController

  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/'/*, [adminMiddleware]*/, this.controller.get as RequestHandler)
    this.router.post('/create'/*, [adminMiddleware]*/, this.controller.create as RequestHandler)
    this.router.patch('/update'/*, [adminMiddleware]*/, this.controller.update as RequestHandler)
    this.router.get('/search'/*, [adminMiddleware]*/, this.controller.search as RequestHandler)

    this.router.post('/update-events'/*, [adminMiddleware]*/, this.controller.updateByEmployee as RequestHandler)
    this.router.get('/search-events'/*, [adminMiddleware]*/, this.controller.search as RequestHandler)
  }
}

const scheduleRoutes: ScheduleRoutes = new ScheduleRoutes()
export default scheduleRoutes.router
