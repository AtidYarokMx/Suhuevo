import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IJob } from '@app/dtos/job.dto'


export const JobSchema = new Schema<IJob>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },

  name: { type: String, required: true, trim: true },
  departmentId: { type: String },

  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
JobSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
JobSchema.post('save', function (doc) {
  DbLogger.info(`[Job][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const JobModel = AppMainMongooseRepo.model<IJob>('job', JobSchema)
