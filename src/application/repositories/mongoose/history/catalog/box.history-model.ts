import { AppHistoryMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { CatalogBoxHistorySchema } from '@app/repositories/mongoose/schemas/catalog/box.schema'
/* dtos */
import { ICommonCatalogFields, ICommonHistoryFields } from '@app/dtos/common.dto'

export const CatalogBoxHistoryModel = AppHistoryMongooseRepo.model<ICommonHistoryFields<ICommonCatalogFields>>("catalog-box", CatalogBoxHistorySchema)