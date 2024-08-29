import { appMailTransporter, type SentMessageInfo } from '@app/repositories/nodemailer'
/* consts */
import { appMailSender, sendEmailsEnabled } from '@app/constants/mail.constants'
import { MailLogger } from '@app/handlers/loggers/mail.logger'
import { customLog } from './util.util'
import { defaultEmail } from '@app/constants/default-values.constants'

export async function appSendEmail (to: string | string[], subject: string, html: string, attachments: any[] = []): Promise<SentMessageInfo> {
  let prefix = ''
  if (!sendEmailsEnabled) {
    to = defaultEmail
    prefix = '[Dev] '
  }
  return await new Promise((resolve, reject) => {
    const mailOptions = {
      from: `Api test Email ${appMailSender as string}`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: `${prefix}${subject}`,
      html,
      attachments
    }

    appMailTransporter.sendMail(mailOptions, (error, info) => {
      if (error !== null) {
        reject(error)
      } else {
        MailLogger.info(`Email enviado: ${String(to)}`)
        customLog(`Email enviado: ${String(to)}`)
        resolve(info)
      }
    })
  })
}
