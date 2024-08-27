import { createLogger, transports, format } from 'winston'

export const UserLogger = createLogger({
  transports: [
    new transports.File({
      dirname: 'logs',
      filename: 'user.log'
    })
  ],
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(({ level, message }) => {
      return `[${level}] ${message as string}`
    })
  )
})
