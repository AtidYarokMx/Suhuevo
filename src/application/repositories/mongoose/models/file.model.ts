import { Schema, model } from '@app/repositories/mongoose'
/* handlers */
import { DbLogger } from '@app/handlers/loggers/db.logger'
/* dtos */
import type { TemporalFile, AppTemporalFile, TemporalFileMethods } from '@app/dtos/file.dto'


export const TemporalFileSchema = new Schema<TemporalFile, AppTemporalFile, TemporalFileMethods>({
  /* required fields */
  filename: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  /* populated */
  idUser: { type: Schema.Types.ObjectId, required: true, ref: "user" },
  /* defaults */
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* methods */
TemporalFileSchema.method("fullpath", function fullpath() {
  return `${this.path}${this.filename}`
})

/* pre (middlewares) */
TemporalFileSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
TemporalFileSchema.post('save', function (doc) {
  DbLogger.info(`[TemporalFile][${String(doc._id)}] Uploaded File: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const TemporalFileModel = model<TemporalFile, AppTemporalFile>('temporal-file', TemporalFileSchema)
