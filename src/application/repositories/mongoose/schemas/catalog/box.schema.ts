/* lib */
import { Model, Schema, SchemaTypes } from '@app/repositories/mongoose'
/* dtos */
import { ICommonCatalogFields, ICommonHistoryFields } from '@app/dtos/common.dto'

export const CatalogBoxSchema = new Schema<ICommonCatalogFields>({
  _id: { type: SchemaTypes.ObjectId, auto: true },
  id: {
    type: String, required: true, validate: {
      validator: async function (value: number) {
        const count = await (this.constructor as Model<ICommonCatalogFields>).countDocuments({ id: value, active: true })
        return count === 0
      },
      message: "Ya existe un registro con ese id"
    }
  },
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true },
  count: { type: Number, default: 0 },
  /* defaults */
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

export const CatalogBoxHistorySchema = new Schema<ICommonHistoryFields<ICommonCatalogFields>>({
  change: {
    type: {
      ...CatalogBoxSchema.clone().obj,
      id: { type: String, required: true }
    }, required: true
  },
  updatedAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedBy: { type: SchemaTypes.ObjectId, required: true }
})