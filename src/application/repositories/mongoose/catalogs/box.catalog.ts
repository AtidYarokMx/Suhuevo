/**
 * Catálogo de tipo de huevos
 */

/* lib */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* history */
import { CatalogBoxHistoryModel } from '@app/repositories/mongoose/history/catalog/box.history-model'
/* schemas */
import { CatalogBoxSchema } from '@app/repositories/mongoose/schemas/catalog/box.schema'
/* dtos */
import { ICommonCatalogFields } from '@app/dtos/common.dto'

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
export const CatalogBoxModel = AppMainMongooseRepo.model<ICommonCatalogFields>("catalog-box", CatalogBoxSchema)