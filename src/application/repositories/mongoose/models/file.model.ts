import { Schema, model } from '@app/repositories/mongoose'
/* handlers */
import { DbLogger } from '@app/handlers/loggers/db.logger'
/* dtos */
import type { IAppFile, AppFile, IAppFileVirtuals } from '@app/dtos/file.dto'


export const AppFileSchema = new Schema<IAppFile, AppFile, Record<string, unknown>, Record<string, unknown>, IAppFileVirtuals>({
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
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

/* virtual fields */
AppFileSchema.virtual("fullpath").get(function () {
  return `${this.path}${this.filename}`
})

/* pre (middlewares) */
AppFileSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
AppFileSchema.post('save', function (doc) {
  DbLogger.info(`[IAppFile][${String(doc._id)}] Uploaded File: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const AppTemporalFileModel = model<IAppFile, AppFile>('temporal-file', AppFileSchema)
export const AppFileModel = model<IAppFile, AppFile>('file', AppFileSchema)
