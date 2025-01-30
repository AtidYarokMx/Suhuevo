/**
 * Catálogo de tipo de huevos
 */

/* lib */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* history */
import { CatalogPaymentMethodHistoryModel } from '@app/repositories/mongoose/history/catalog/payment-method.history-model'
/* schemas */
import { CatalogPaymentMethodSchema } from '@app/repositories/mongoose/schemas/catalog/payment-method.schema'
/* dtos */
import { IPaymentMethod } from '@app/dtos/payment-method.dto'



/* pre (middlewares) */
CatalogPaymentMethodSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
CatalogPaymentMethodSchema.post('save', async function (doc) {
  const history = new CatalogPaymentMethodHistoryModel({
    change: { ...doc },
    updatedBy: doc.lastUpdateBy
  })
  await history.save()
})

/* model instance */
export const CatalogPaymentMethodModel = AppMainMongooseRepo.model<IPaymentMethod>("catalog-payment-method", CatalogPaymentMethodSchema)