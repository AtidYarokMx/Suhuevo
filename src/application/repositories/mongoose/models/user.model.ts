import { Schema, model } from '@app/repositories/mongoose'
import { UserLogger } from '@app/handlers/loggers/user.logger'
import { type IUser } from '@app/dtos/user.dto'

export const UserSchema = new Schema<IUser>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  firstLastName: { type: String, trim: true, default: '' },
  secondLastName: { type: String, trim: true, default: '' },
  role: { type: String, required: true },

  userName: { type: String, required: true, trim: true, unique: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  /* defaults */
  password: { type: String, required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
})

/* methods */
UserSchema.method('fullname', function fullname () {
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
export const UserModel = model<IUser>('user', UserSchema)
