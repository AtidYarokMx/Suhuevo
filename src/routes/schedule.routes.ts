import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { authenticateUser } from '@app/middlewares/auth.middleware'
import { scheduleExceptionController } from '@controllers/schedule-exception.controller'

class ScheduleRoutes extends ServerRouter {
  controller = scheduleExceptionController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', [authenticateUser], this.controller.get as RequestHandler)
    this.router.post('/create', [authenticateUser], this.controller.create as RequestHandler)
    this.router.patch('/update', [authenticateUser], this.controller.update as RequestHandler)
    this.router.get('/search', [authenticateUser], this.controller.search as RequestHandler)

    this.router.post('/update-events', [authenticateUser], this.controller.updateByEmployee as RequestHandler)
    this.router.get('/search-events', [authenticateUser], this.controller.search as RequestHandler)
  }
}

const scheduleRoutes: ScheduleRoutes = new ScheduleRoutes()
export default scheduleRoutes.router
