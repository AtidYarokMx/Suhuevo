/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { createLogger, transports, format } from 'winston'

export const colorizer = format.combine(
  format((info, opts) => {
    if (info.level === 'error') info.message = `\x1b[31m${info.message}\x1b[0m` // Rojo para errores
    else if (info.level === 'warn') info.message = `\x1b[33m${info.message}\x1b[0m` // Amarillo para advertencias
    else info.message = `\x1b[32m${info.message}\x1b[0m` // Verde para otros niveles
    return info
  })()
)

export const ServerLogger = createLogger({
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
      filename: 'server.log',
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
