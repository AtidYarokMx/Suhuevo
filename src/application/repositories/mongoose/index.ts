import mongoose from 'mongoose'
/* settings */
// import { AppMongooseSettings } from './mongoose.settings'
import { ServerLogger } from '@app/handlers/loggers/server.logger'

mongoose.set('strictQuery', false)
mongoose.connect(
  process.env.MONGODB_URI ?? ''
).catch((e) => {
  ServerLogger.error(String(e))
})

/* client repo */
export const AppMongooseRepo = mongoose.connection

AppMongooseRepo.on('error', (e) => ServerLogger.error(String(e)))
AppMongooseRepo.on('open', () => ServerLogger.info('db connection success!'))

/* exports */
export { Schema, model, Types, Model, SchemaTypes, Document } from 'mongoose'
