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
import userRoutes from './routes/user.routes'
import selectRoutes from '@routes/select.routes'
import authRoutes from './routes/auth.routes'
import serverRoutes from '@routes/server.routes'
import employeeRoutes from '@routes/employee.routes';
import deparmentRoutes from '@routes/deparment.routes';
import jobRoutes from '@routes/job.routes';
import scheduleRoutes from '@routes/schedule.routes';
import attendanceRoutes from '@routes/attendance.routes';
import downloadRoutes from '@routes/download.routes';
import absenceRoutes from '@routes/absence.routes';
import payrollRoutes from '@routes/payroll.routes';
import fileRoutes from '@routes/file.routes';

/* cronjobs */
import { dailyAbsencesCronJob, dailyPayrollCronJob } from './cronjobs/cronjob.controller';

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
    this.app.use('/docs', downloadRoutes)
    this.app.use('/api/server', serverRoutes)
    this.app.use('/api/auth', authRoutes)
    this.app.use('/api/employee', employeeRoutes)
    this.app.use('/api/department', deparmentRoutes)
    this.app.use('/api/job', jobRoutes)
    this.app.use('/api/schedule', scheduleRoutes)
    this.app.use('/api/attendance', attendanceRoutes)
    this.app.use('/api/absence', absenceRoutes)
    this.app.use('/api/payroll', payrollRoutes)
    this.app.use('/api/file', fileRoutes)
  }

  crons(): void {
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
}
