/**
 * Modelo de Granjas
 */

/* lib */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* history */
import { FarmHistoryModel } from '@app/repositories/mongoose/history/farm.history-model'
/* schema */
import { FarmSchema } from '@app/repositories/mongoose/schemas/farm.schema'
/* types */
import { type IFarm, type AppFarmModel } from '@app/dtos/farm.dto'



/* virtuals */
FarmSchema.virtual("sheds", {
  ref: "shed",
  localField: "_id",
  foreignField: "farm",
})

/* pre (middlewares) */
FarmSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
FarmSchema.post('save', async function (doc) {
  const history = new FarmHistoryModel({
    change: { ...doc },
    updatedBy: doc.lastUpdateBy
  })
  await history.save()
})

/* model instance */
export const FarmModel = AppMainMongooseRepo.model<IFarm, AppFarmModel>("farm", FarmSchema)