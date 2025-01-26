/**
 * Catálogo de tipo de huevos
 */

/* lib */
import { Model, Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
/* logger */
import { DbLogger } from '@app/handlers/loggers/db.logger'
/* dtos */
import { IEggType } from '@app/dtos/egg.dto'

export const CatalogEggSchema = new Schema<IEggType>({
  id: {
    type: Number, required: true, validate: {
      validator: async function (value: number) {
        const count = await (this.constructor as Model<IEggType>).countDocuments({ id: value, active: true })
        return count === 0
      },
      message: "Ya existe un registro con ese id"
    }
  },
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true },
  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

/* pre (middlewares) */
CatalogEggSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
CatalogEggSchema.post('save', function (doc) {
  DbLogger.info(`[Catalog - Egg][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const CatalogEggModel = AppMainMongooseRepo.model<IEggType>("catalog-egg", CatalogEggSchema)