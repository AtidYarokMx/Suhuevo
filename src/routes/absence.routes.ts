import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { attendanceController } from '@controllers/attendance.controller'
import { uploadFileMiddleware } from '@app/middlewares/upload.middleware'
import { absenceController } from '@controllers/absence.controller'


class AttendanceRoutes extends ServerRouter {
  controller = absenceController

  constructor () {
    super()
    this.config()
  }

  config (): void {
    this.router.get('/'/*, [adminMiddleware]*/, this.controller.get as RequestHandler)
    this.router.get('/search'/*, [adminMiddleware]*/, this.controller.search as RequestHandler)

    this.router.post('/import-csv', uploadFileMiddleware.single('file'), attendanceController.importFromCsv)
  }
}

const attendanceRoutes: AttendanceRoutes = new AttendanceRoutes()
export default attendanceRoutes.router
