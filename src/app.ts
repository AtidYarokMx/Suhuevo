/* aliases an environment variables */
import 'module-alias/register'
import 'dotenv/config'

/* application */
import express, { type Application } from 'express'
import morgan from 'morgan';
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import https from 'https'
import * as http from 'http'
import cookieParser from 'cookie-parser'
import mongoSanitize from 'express-mongo-sanitize'
import fsPromises from 'fs/promises'

/* consts */
import { cors as serverCors } from '@app/constants/cors.constants'
import { tempDocsDir } from '@app/constants/file.constants'

/* handlers */
import { ServerLogger } from '@app/handlers/loggers/server.logger'

/* routes */
import personalBonusRoutes from '@routes/personal-bonus.routes';
import boxProductionRoutes from '@routes/box-production.routes';
import attendanceRoutes from '@routes/attendance.routes';
import deparmentRoutes from '@routes/deparment.routes';
import inventoryRoutes from '@routes/inventory.routes';
import employeeRoutes from '@routes/employee.routes';
import shipmentRoutes from '@routes/shipment.routes';
import scheduleRoutes from '@routes/schedule.routes';
import downloadRoutes from '@routes/download.routes';
import absenceRoutes from '@routes/absence.routes';
import payrollRoutes from '@routes/payroll.routes';
import holidayRoutes from '@routes/holiday.routes';
import catalogRoutes from '@routes/catalog.routes';
import serverRoutes from '@routes/server.routes'
import clientRoutes from '@routes/client.routes';
import bonusRoutes from '@routes/bonus.routes';
import fileRoutes from '@routes/file.routes';
import ruleRoutes from '@routes/rule.routes';
import authRoutes from '@routes/auth.routes';
import farmRoutes from '@routes/farm.routes';
import shedRoutes from '@routes/shed.routes';
import jobRoutes from '@routes/job.routes';

/* cronjobs */
import { dailyAbsencesCronJob, dailyAutomaticAttendancesCronJob, dailyPayrollCronJob } from './cronjobs/cronjob.controller';
import overtimeRoutes from '@routes/overtime.routes';

// import csurf from 'csurf'


/* app class */
export class AppServer {
  public app: Application
  private readonly server: https.Server // https
  private readonly serverInsecure

  constructor() {
    this.app = express()
    this.server = https.createServer(this.getHttpsOptions(), this.app) // https
    this.serverInsecure = http.createServer(this.app)
    /* init methods */
    this.config()
    this.routes()
    void this.initFolders()
  }

  private getHttpsOptions(): any { // https
    return {
      key: fs.readFileSync(path.resolve(__dirname, 'SSL/proavicolKey.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'SSL/fullchain.pem'))
    }
  }

  config(): void {
    this.app.set('port', process.env.PORT ?? 443)
    this.app.set('port2', process.env.PORT2 ?? 80)
    this.app.use(morgan('dev'))
    this.app.use(cors(serverCors))
    // this.app.use(clientMiddleware)
    this.app.use(cookieParser())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))
    this.app.use(mongoSanitize())
    // this.app.use(csurf({ cookie: true }))
  }

  routes(): void {
    this.app.use('/favicon.ico', express.static(path.join(__dirname, '../images/favicon.ico')))
    this.app.use('/public', express.static(path.join(__dirname, '../public')))
    this.app.use('/api/personal-bonus', personalBonusRoutes)
    this.app.use('/api/attendance', attendanceRoutes)
    this.app.use('/api/department', deparmentRoutes)
    this.app.use('/api/inventory', inventoryRoutes)
    this.app.use('/api/boxes', boxProductionRoutes)
    this.app.use('/api/employee', employeeRoutes)
    this.app.use('/api/schedule', scheduleRoutes)
    this.app.use('/api/overtime', overtimeRoutes)
    this.app.use('/api/shipment', shipmentRoutes)
    this.app.use('/api/absence', absenceRoutes)
    this.app.use('/api/payroll', payrollRoutes)
    this.app.use('/api/catalog', catalogRoutes)
    this.app.use('/api/holiday', holidayRoutes)
    this.app.use('/api/server', serverRoutes)
    this.app.use('/api/client', clientRoutes)
    this.app.use('/api/bonus', bonusRoutes)
    this.app.use('/docs', downloadRoutes)
    this.app.use('/api/auth', authRoutes)
    this.app.use('/api/rule', ruleRoutes)
    this.app.use('/api/file', fileRoutes)
    this.app.use('/api/farm', farmRoutes)
    this.app.use('/api/shed', shedRoutes)
    this.app.use('/api/job', jobRoutes)
  }

  crons(): void {
    dailyAutomaticAttendancesCronJob.start()
    dailyAbsencesCronJob.start()
    dailyPayrollCronJob.start()
  }

  async initFolders(): Promise<void> {
    if (!fs.existsSync(tempDocsDir)) await fsPromises.mkdir(tempDocsDir, { recursive: true })
  }

  start(): void {
    this.server.listen(this.app.get('port'), () => {
      ServerLogger.info(`Server listening on \x1b[34mhttps://localhost:${this.app.get('port') as string}\x1b[0m`)
    })
    this.serverInsecure.listen(this.app.get('port2'), () => {
      ServerLogger.info(`Server listening on \x1b[34mhttp://localhost:${this.app.get('port2')}\x1b[0m`)
    })
  }

  close() {
    this.server.close()
    this.serverInsecure.close()
  }
}
