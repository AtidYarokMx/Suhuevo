import { AppCounterMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { ShipmentCounterSchema } from '@app/repositories/mongoose/schemas/shipment.schema'
/* dtos */
import { ICommonCounterFields } from '@app/dtos/common.dto'

export const ShipmentCounterModel = AppCounterMongooseRepo.model<ICommonCounterFields>("shipment", ShipmentCounterSchema)