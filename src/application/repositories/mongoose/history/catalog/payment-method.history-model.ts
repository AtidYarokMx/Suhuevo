import { AppHistoryMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { CatalogPaymentMethodHistorySchema } from '@app/repositories/mongoose/schemas/catalog/payment-method.schema'
/* dtos */
import { IPaymentMethod } from '@app/dtos/payment-method.dto'
import { ICommonHistoryFields } from '@app/dtos/common.dto'

export const CatalogPaymentMethodHistoryModel = AppHistoryMongooseRepo.model<ICommonHistoryFields<IPaymentMethod>>("catalog-payment-method", CatalogPaymentMethodHistorySchema)