import { AppHistoryMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { ShipmentHistorySchema } from '@app/repositories/mongoose/schemas/shipment.schema'
/* dtos */
import { IShipment } from '@app/dtos/shipment.dto'
import { ICommonHistoryFields } from '@app/dtos/common.dto'

export const ShipmentHistoryModel = AppHistoryMongooseRepo.model<ICommonHistoryFields<IShipment>>("shipments", ShipmentHistorySchema)