import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { authenticateUser } from '@app/middlewares/auth.middleware'
import { absenceController } from '@controllers/absence.controller'


class AttendanceRoutes extends ServerRouter {
  controller = absenceController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', [authenticateUser], this.controller.get as RequestHandler)
    this.router.get('/search', [authenticateUser], this.controller.search as RequestHandler)
    this.router.patch('/update', [authenticateUser], this.controller.update as RequestHandler)
  }
}

const attendanceRoutes: AttendanceRoutes = new AttendanceRoutes()
export default attendanceRoutes.router
