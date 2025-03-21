import { ICatalogBox } from '@app/dtos/box-catalog.dto';
import { ICommonCatalogFields, ICommonHistoryFields } from '@app/dtos/common.dto';
import { Schema, AppMainMongooseRepo, SchemaTypes } from '@app/repositories/mongoose'

export const CatalogBoxSchema = new Schema<ICatalogBox>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: "box-category", required: true },
  description: { type: String },
  count: { type: Number, required: true }, // Cantidad de huevos por caja
  tare: { type: Number, required: true, default: 0 }, // 🆕 Peso tara agregado
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
},
  { timestamps: true }
)
/* pre (middlewares) */
CatalogBoxSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})



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

/* model instance */
export const CatalogBoxModel = AppMainMongooseRepo.model<ICatalogBox>("catalog-box", CatalogBoxSchema);
