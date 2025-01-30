import { IClient } from '@app/dtos/client.dto'
import { ICommonCounterFields, ICommonHistoryFields } from '@app/dtos/common.dto'
import { Model, Schema, SchemaTypes } from '@app/repositories/mongoose'

export const ClientSchema = new Schema<IClient>({
  id: {
    type: String, immutable: true, validate: {
      validator: async function (value: string) {
        const count = await (this.constructor as Model<IClient>).countDocuments({ id: value, active: true })
        return count === 0
      },
      message: "Ya existe un registro con ese id"
    }
  },
  name: { type: String, trim: true, required: true },
  firstLastName: { type: String, trim: true, required: true },
  secondLastName: { type: String, trim: true },
  email: { type: String, trim: true, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  rfc: { type: String, uppercase: true },
  businessName: { type: String },
  businessAddress: { type: String },
  businessPhone: { type: String },
  /* defaults */
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
})

export const ClientHistorySchema = new Schema<ICommonHistoryFields<IClient>>({
  change: {
    type: {
      ...ClientSchema.clone().obj,
      id: { type: String, required: true }
    }, required: true
  },
  updatedAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedBy: { type: SchemaTypes.ObjectId, required: true }
})

export const ClientCounterSchema = new Schema<ICommonCounterFields>({
  id: { type: String, unique: true, required: true },
  value: { type: Number, default: 0 }
})