/* aliases an environment variables */
import 'module-alias/register'
import 'dotenv/config'

/* application */
import express, { type Application } from 'express'
import morgan from 'morgan';
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import * as http from 'http'
import cookieParser from 'cookie-parser'

import fsPromises from 'fs/promises'
/* routes */
import userRoutes from './routes/user.routes'
import authRoutes from './routes/auth.routes'

/* middlewares */
// import { clientMiddleware } from '@app/middlewares/client.middleware'

/* consts */
import { cors as serverCors } from '@app/constants/cors.constants'
import { tempDocsDir } from '@app/constants/file.constants'
import { ServerLogger } from '@app/handlers/loggers/server.logger'
import path from 'path'

import selectRoutes from '@routes/select.routes'
import serverRoutes from '@routes/server.routes'
import employeeRoutes from '@routes/employee.routes';
import deparmentRoutes from '@routes/deparment.routes';
import jobRoutes from '@routes/job.routes';
import scheduleRoutes from '@routes/schedule.routes';
import attendanceRoutes from '@routes/attendance.routes';
import { dailyAbsencesCronJob, dailyPayrollCronJob } from './cronjobs/cronjob.controller';

// import csurf from 'csurf'


/* app class */
export class AppServer {
  public app: Application
  private readonly server: https.Server // https
  private readonly serverInsecure

  constructor () {
    this.app = express()
    this.server = https.createServer(this.getHttpsOptions(), this.app) // https
    this.serverInsecure = http.createServer(this.app)
    /* init methods */
    this.config()
    this.routes()
    void this.initFolders()
  }

  private getHttpsOptions (): any { // https
    return {
      key: fs.readFileSync('./SSL/key.pem'),
      cert: fs.readFileSync('./SSL/fullchain.pem')
    }
  }

  config (): void {
    this.app.set('port', process.env.PORT ?? 443)
    this.app.use(morgan('dev'))
    this.app.use(cors(serverCors))
    // this.app.use(clientMiddleware)
    this.app.use(cookieParser())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))
    // this.app.use(csurf({ cookie: true }))
  }

  routes (): void {
    this.app.use('/favicon.ico', express.static(path.join(__dirname, '../images/favicon.ico')))
    this.app.use('/api/server', serverRoutes)
    this.app.use('/api/employee', employeeRoutes)
    this.app.use('/api/department', deparmentRoutes)
    this.app.use('/api/job', jobRoutes)
    this.app.use('/api/schedule', scheduleRoutes)
    this.app.use('/api/attendance', attendanceRoutes)
  }

  crons (): void {
    dailyAbsencesCronJob.start()
    dailyPayrollCronJob.start()
  }

  async initFolders (): Promise<void> {
    if (!fs.existsSync(tempDocsDir)) await fsPromises.mkdir(tempDocsDir, { recursive: true })
  }

  start (): void {
    this.server.listen(this.app.get('port'), () => {
      ServerLogger.info(`Server listening on \x1b[34mhttps://localhost:${this.app.get('port') as string}\x1b[0m`)
    })
    this.serverInsecure.listen(60102, () => {
      ServerLogger.info(`Server listening on \x1b[34mhttp://localhost:${60102}\x1b[0m`)
    })
  }
}
