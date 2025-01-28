/**
 * Modelo de Granjas
 */

/* lib */
import { Schema, AppMainMongooseRepo, Model } from '@app/repositories/mongoose'
/* handlers */
import { UserLogger } from '@app/handlers/loggers/user.logger'
/* types */
import { type IFarm, type AppFarmModel, type IFarmVirtuals, FarmStatus } from '@app/dtos/farm.dto'

export const FarmSchema = new Schema<IFarm, AppFarmModel, {}, {}, IFarmVirtuals>({
  name: { type: String, trim: true, required: true },
  description: { type: String, trim: true, required: true },
  farmNumber: {
    type: Number, validate: {
      validator: async function (value: number) {
        const count = await (this.constructor as Model<IFarm>).countDocuments({ farmNumber: value, active: true })
        return count === 0
      },
      message: "Ya existe un registro con ese id"
    }
  },
  /* enums */
  status: { type: String, enum: FarmStatus, default: FarmStatus.ACTIVE },
  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } })

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
FarmSchema.post('save', function (doc) {
  UserLogger.info(`[Farm][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const FarmModel = AppMainMongooseRepo.model<IFarm, AppFarmModel>("farm", FarmSchema)