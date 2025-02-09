// import { ProductModel } from '@app/repositories/mongoose/models/product.model'
import { absenceController } from '@controllers/absence.controller'
import { ServerRouter } from './models/route'
import { attendanceController } from '@controllers/attendance.controller'
class ServerRoutes extends ServerRouter {
  constructor() {
    super()
    this.config()
  }

  config(): void {
    this.router.get('/ping', (_req: any, res: any) => { res.json({ ok: true }) })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.router.get('/action', async (_req: any, res: any) => {
      res.json(await this.action())
    })

    // this.router.post('/cronjob/generate-absences', absenceController.generateDailyAbsences)
    // this.router.post('/cronjob/generate-automatic-attendances', attendanceController.generateAutomaticDailyAttendances)
  }

  async action(): Promise<any> {
    // const updated = await ProductModel.updateMany({ active: true }, { price: 85 })
    // console.log(updated)
    // return updated
  }
}

const serverRoutes: ServerRoutes = new ServerRoutes()
export default serverRoutes.router
