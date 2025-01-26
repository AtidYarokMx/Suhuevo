import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IDepartment } from '@app/dtos/deparment.dto'

export const DepartmentSchema = new Schema<IDepartment>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },

  name: { type: String, required: true, trim: true },
  managerId: { type: String },

  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
DepartmentSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
DepartmentSchema.post('save', function (doc) {
  DbLogger.info(`[Department][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const DepartmentModel = AppMainMongooseRepo.model<IDepartment>('department', DepartmentSchema)
