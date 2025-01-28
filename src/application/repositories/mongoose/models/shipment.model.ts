import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* schemas */
import { ShipmentSchema } from '@app/repositories/mongoose/schemas/shipment.schema'
/* history */
import { ShipmentHistoryModel } from '@app/repositories/mongoose/history/shipment.history-model'
/* dtos */
import { IShipment } from "@app/dtos/shipment.dto";

/* pre (middlewares) */
ShipmentSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
ShipmentSchema.post('save', async function (doc) {
  const history = new ShipmentHistoryModel({
    change: { ...doc },
    updatedBy: doc.lastUpdateBy
  })
  await history.save()
})

/* model instance */
export const ShipmentModel = AppMainMongooseRepo.model<IShipment>('shipments', ShipmentSchema)