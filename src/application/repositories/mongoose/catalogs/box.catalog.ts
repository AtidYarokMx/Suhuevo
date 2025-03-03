import { ICatalogBox } from '@app/dtos/box-catalog.dto';
import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import { CatalogBoxHistoryModel } from '@app/repositories/mongoose/history/catalog/box.history-model'

export const CatalogBoxSchema = new Schema<ICatalogBox>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
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

/* post (middlewares) */
CatalogBoxSchema.post('save', async function (doc) {
  const history = new CatalogBoxHistoryModel({
    change: { ...doc },
    updatedBy: doc.lastUpdateBy
  })
  await history.save()
})

/* model instance */
export const CatalogBoxModel = AppMainMongooseRepo.model<ICatalogBox>("catalog-box", CatalogBoxSchema);
