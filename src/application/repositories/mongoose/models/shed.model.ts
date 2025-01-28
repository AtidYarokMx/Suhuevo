/**
 * Modelo de Casetas
 */

/* lib */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* history */
import { ShedHistoryModel } from '@app/repositories/mongoose/history/shed.history-model'
/* schema */
import { ShedSchema } from '@app/repositories/mongoose/schemas/shed.schema'
/* utils */
import { calculateWeeksFromDate } from '@app/utils/date.util'
/* dtos */
import type { AppShedModel, IShed } from '@app/dtos/shed.dto'

/* virtuals */
ShedSchema.virtual("inventory", {
  ref: "inventory",
  localField: "_id",
  foreignField: "shed",
  justOne: true
})

ShedSchema.virtual("chickenAge").get(function () {
  if (typeof this.chickenBirth === "undefined") return null
  return calculateWeeksFromDate(this.chickenBirth)
})

/* pre (middlewares) */
ShedSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
ShedSchema.post('save', async function (doc) {
  const history = new ShedHistoryModel({
    change: { ...doc },
    updatedBy: doc.lastUpdateBy
  })
  await history.save()
})

/* model instance */
export const ShedModel = AppMainMongooseRepo.model<IShed, AppShedModel>("shed", ShedSchema)