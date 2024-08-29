/* repo */
import { Schema, model } from '@app/repositories/mongoose'
/* dtos */
import { type IResetPass, type TResetModel } from '@app/dtos/resetPass.dto'
import { UserLogger } from '@app/handlers/loggers/user.logger'

export const ResetSchema = new Schema<IResetPass, TResetModel>({
  email: { type: String, required: true, trim: true },
  uuid: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
})

/* pre (middlewares) */
ResetSchema.pre('save', function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
ResetSchema.post('save', function (doc) {
  UserLogger.info(`[User][${String(doc._id)}] Datos de reset creados: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const ResetModel = model<IResetPass, TResetModel>('resetpass', ResetSchema)
