/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { createLogger, transports, format } from 'winston'
import { colorizer } from './server.logger'

export const SessionLogger = createLogger({
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        colorizer,
        format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}][${level}] ${message as string}`
        })
      )
    }),
    new transports.File({
      dirname: 'logs',
      filename: 'session.log',
      format: format.combine(
        format.uncolorize(),
        format.timestamp(),
        format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}][${level}] ${message as string}`
        })
      )
    })
  ]
})
