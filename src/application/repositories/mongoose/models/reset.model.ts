/* repo */
import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
/* dtos */
import { type IResetPass, type TResetModel } from '@app/dtos/reset-pass.dto'
import { UserLogger } from '@app/handlers/loggers/user.logger'

export const ResetSchema = new Schema<IResetPass, TResetModel>({
  uuid: { type: String, required: true, trim: true },
  user: { type: Schema.Types.ObjectId, required: true, ref: "user" },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
  active: { type: Boolean, default: true }
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
export const ResetModel = AppMainMongooseRepo.model<IResetPass, TResetModel>('reset-pass', ResetSchema)
