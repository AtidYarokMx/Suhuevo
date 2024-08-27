import { createLogger, transports, format } from 'winston'

export const MailLogger = createLogger({
  transports: [new transports.Console(), new transports.File({
    dirname: 'logs',
    filename: 'mail.log'
  })],
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(({ level, message }) => {
      return `[${level}] ${message as string}`
    })
  )
})
