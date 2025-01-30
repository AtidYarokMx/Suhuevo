import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import { UserLogger } from '@app/handlers/loggers/user.logger'
import { AppUserModel, IUserVirtuals, type IUser } from '@app/dtos/user.dto'

export const UserSchema = new Schema<IUser, AppUserModel, {}, {}, IUserVirtuals>({
  /* required fields */
  id: { type: String, trim: true, unique: true },
  name: { type: String, trim: true },
  firstLastName: { type: String, trim: true, default: '' },
  secondLastName: { type: String, trim: true, default: '' },
  role: { type: String, required: true },

  userName: { type: String, trim: true, unique: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  /* defaults */
  password: { type: String },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

/* virtuals */
UserSchema.virtual('fullname').get(function () {
  return `${String(this.name)} ${String(this.firstLastName)} ${String(this.secondLastName)}`.trim()
})

/* pre (middlewares) */
UserSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
UserSchema.post('save', function (doc) {
  UserLogger.info(`[User][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const UserModel = AppMainMongooseRepo.model<IUser, AppUserModel>('user', UserSchema)
