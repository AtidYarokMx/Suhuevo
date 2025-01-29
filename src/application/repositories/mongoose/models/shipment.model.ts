import type { CallbackError } from 'mongoose';
/* repos */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* schemas */
import { ShipmentSchema } from '@app/repositories/mongoose/schemas/shipment.schema'
/* history */
import { ShipmentHistoryModel } from '@app/repositories/mongoose/history/shipment.history-model'
/* counter */
import { ShipmentCounterModel } from '@app/repositories/mongoose/counters/shipment.counter'
/* dtos */
import { IShipment } from "@app/dtos/shipment.dto";
import { padStart } from '@app/utils/string.util';

/* pre (middlewares) */
ShipmentSchema.pre('save', async function (next) {
  try {
    const count = await ShipmentCounterModel.findOneAndUpdate({ id: "shipment-number" }, { $inc: { value: 1 } }, { new: true, upsert: true }).exec()
    this.id = padStart(count.value, 10, '0')
    this.updatedAt = new Date(Date.now())
    next()
  } catch (err) {
    next(err as CallbackError)
  }
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