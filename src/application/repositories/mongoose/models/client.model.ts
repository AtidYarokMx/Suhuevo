/**
 * Modelo de Casetas
*/

/* lib */
import type { CallbackError } from 'mongoose'
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* history */
import { ClientHistoryModel } from '@app/repositories/mongoose/history/client.history-model'
/* counter */
import { ClientCounterModel } from '@app/repositories/mongoose/counters/client.counter'
/* schema */
import { ClientSchema } from '@app/repositories/mongoose/schemas/client.schema'
/* utils */
import { padStart } from '@app/utils/string.util'
/* dtos */
import type { IClient } from '@app/dtos/client.dto'

/* pre (middlewares) */
ClientSchema.pre('save', async function (next) {
  try {
    const count = await ClientCounterModel.findOneAndUpdate({ id: "client-number" }, { $inc: { value: 1 } }, { new: true, upsert: true }).exec()
    this.id = padStart(count.value, 10, '0')
    this.updatedAt = new Date(Date.now())
    next()
  } catch (err) {
    next(err as CallbackError)
  }
})

/* post (middlewares) */
ClientSchema.post('save', async function (doc) {
  const history = new ClientHistoryModel({
    change: { ...doc },
    updatedBy: doc.lastUpdateBy
  })
  await history.save()
})

/* model instance */
export const ClientModel = AppMainMongooseRepo.model<IClient>("client", ClientSchema)