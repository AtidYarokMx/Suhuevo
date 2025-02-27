import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { authenticateUser } from '@app/middlewares/auth.middleware'
/* controllers */
import { holidayController } from '@controllers/holiday.controller'

class HolidayRoutes extends ServerRouter {
  controller = holidayController

  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.post('/', [authenticateUser], this.controller.create as RequestHandler)
  }
}

const holidayRoutes: HolidayRoutes = new HolidayRoutes()
export default holidayRoutes.router
