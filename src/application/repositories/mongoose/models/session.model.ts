/* repo */
import { Schema, model } from '@app/repositories/mongoose'
/* handlers */
import { SessionLogger } from '@app/handlers/loggers/session.logger'
/* dtos */
import { type ISessionClient, type ISession, type ISessionOs, type ISessionDevice } from '@app/dtos/session.dto'

const SessionClientSchema = new Schema<ISessionClient>({
  /* required fields */
  type: { type: String, immutable: true, required: true },
  name: { type: String, immutable: true, required: true },
  version: { type: String, immutable: true, required: true },
  /* non-required fields */
  short_name: { type: String, immutable: true },
  engine: { type: String, immutable: true },
  engine_version: { type: String, immutable: true },
  family: { type: String, immutable: true }
})

const SessionOsSchema = new Schema<ISessionOs>({
  /* non-required fields */
  name: { type: String, immutable: true },
  short_name: { type: String, immutable: true },
  version: { type: String, immutable: true },
  platform: { type: String, immutable: true },
  family: { type: String, immutable: true }
})

const SessionDeviceSchema = new Schema<ISessionDevice>({
  /* non-required fields */
  id: { type: String, immutable: true },
  type: { type: String, immutable: true },
  brand: { type: String, immutable: true },
  model: { type: String, immutable: true }
})

export const SessionSchema = new Schema<ISession>({
  id: { type: String, required: true, trim: true, unique: true },
  refreshToken: { type: String, immutable: true, required: false },
  ipAddress: { type: String, immutable: true, required: true },
  expiryDate: { type: Date, immutable: true, required: false },
  /* required device info */
  client: { type: SessionClientSchema, immutable: true },
  /* non-required device info */
  os: { type: SessionOsSchema, immutable: true },
  device: { type: SessionDeviceSchema, immutable: true },
  /* refs */
  user: { type: Schema.Types.ObjectId, ref: 'user', immutable: true },
  /* defaults */
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  active: { type: Boolean, default: true }
})

/* post (middlewares) */
SessionSchema.post('save', function (doc) {
  SessionLogger.info(`[Session][${String(doc._id)}] Sesión creada: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const SessionModel = model<ISession>('sessions', SessionSchema)
