import mongoose from 'mongoose'
/* settings */
import { AppMongooseSettings } from './mongoose.settings'
import { ServerLogger } from '@app/handlers/loggers/server.logger'

mongoose.set('strictQuery', false)

/* client repo */
export const AppMainMongooseRepo = mongoose.createConnection(process.env.MONGODB_URI ?? '', { ...AppMongooseSettings })
export const AppCounterMongooseRepo = mongoose.createConnection(process.env.MONGODB_URI_COUNTER ?? '', { ...AppMongooseSettings })
export const AppHistoryMongooseRepo = mongoose.createConnection(process.env.MONGODB_URI_HISTORY ?? '', { ...AppMongooseSettings })

AppMainMongooseRepo.on('error', (e) => ServerLogger.error(String(e)))
AppMainMongooseRepo.on('open', () => ServerLogger.info('main db connection success!'))

AppCounterMongooseRepo.on('error', (e) => ServerLogger.error(String(e)))
AppCounterMongooseRepo.on('open', () => ServerLogger.info('counter db connection success!'))

AppHistoryMongooseRepo.on('error', (e) => ServerLogger.error(String(e)))
AppHistoryMongooseRepo.on('open', () => ServerLogger.info('history db connection success!'))

/* exports */
export { Schema, Types, Model, SchemaTypes, Document } from 'mongoose'
