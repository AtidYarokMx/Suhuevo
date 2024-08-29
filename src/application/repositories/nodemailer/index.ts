import nodemailer from 'nodemailer'
/* consts */
import { appMailSender as user, appMailPassword as pass, appMailHost as host, appMailPort as port, appMailSSL as secure } from '@app/constants/mail.constants'

export const appMailTransporter = nodemailer.createTransport({
  host,
  port,
  secure, // true for 465, false for other ports
  // requireTLS: true,
  auth: {
    user, // generated ethereal user
    pass // generated ethereal password
  }
})

export type { SentMessageInfo } from 'nodemailer'
