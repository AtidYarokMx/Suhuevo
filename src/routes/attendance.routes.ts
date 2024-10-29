import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { attendanceController } from '@controllers/attendance.controller'
import { uploadFileMiddleware } from '@app/middlewares/upload.middleware'


class AttendanceRoutes extends ServerRouter {
  controller = attendanceController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/', [adminMiddleware], this.controller.get as RequestHandler)
    this.router.post('/create', [adminMiddleware], this.controller.create as RequestHandler)
    this.router.patch('/update', [adminMiddleware], this.controller.update as RequestHandler)
    this.router.get('/search', [adminMiddleware], this.controller.search as RequestHandler)
    // this.router.get('/csv', this.controller.startCalculations as RequestHandler)

    this.router.post('/import-csv', adminMiddleware, uploadFileMiddleware.single('file'), this.controller.importFromCsv as RequestHandler)
  }
}

const attendanceRoutes: AttendanceRoutes = new AttendanceRoutes()
export default attendanceRoutes.router
