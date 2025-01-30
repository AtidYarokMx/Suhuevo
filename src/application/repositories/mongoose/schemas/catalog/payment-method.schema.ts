import { ICommonHistoryFields } from '@app/dtos/common.dto'
import { IPaymentMethod } from '@app/dtos/payment-method.dto'
import { Model, Schema, SchemaTypes } from '@app/repositories/mongoose'

export const CatalogPaymentMethodSchema = new Schema<IPaymentMethod>({
  id: {
    type: String, required: true, validate: {
      validator: async function (value: string) {
        const count = await (this.constructor as Model<IPaymentMethod>).countDocuments({ id: value, active: true })
        return count === 0
      },
      message: "Ya existe un registro con ese id"
    }
  },
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true },
  /* defaults */
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

export const CatalogPaymentMethodHistorySchema = new Schema<ICommonHistoryFields<IPaymentMethod>>({
  change: {
    type: {
      ...CatalogPaymentMethodSchema.clone().obj,
      id: { type: String, required: true }
    }, required: true
  },
  updatedAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedBy: { type: SchemaTypes.ObjectId, required: true }
})