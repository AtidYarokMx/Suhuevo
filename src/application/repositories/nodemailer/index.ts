import nodemailer from 'nodemailer'
/* consts */
import { appMailSender as user, appMailPassword as pass, appMailHost as host, appMailPort as port, appMailSSL as secure } from '@app/constants/mail.constants'
/* plugins */
import { nodemailerMjmlPlugin } from 'nodemailer-mjml'
import { join } from 'path'

const appMailTransporter = nodemailer.createTransport({
  host,
  port: Number(port),
  secure: false,
  auth: {
    user,
    pass
  },
  tls: {
    rejectUnauthorized: false,
  }
})

appMailTransporter.use("compile", nodemailerMjmlPlugin({ templateFolder: join(__dirname, "../../../../templates") }))

export { appMailTransporter }

export type { SentMessageInfo } from 'nodemailer'
