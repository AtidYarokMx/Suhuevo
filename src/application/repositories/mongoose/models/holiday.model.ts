import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
/* handlers */
import { DbLogger } from '@app/handlers/loggers/db.logger'
/* dtos */
import { type IHoliday, HolidayType } from '@app/dtos/holiday.dto'
import { validateYear } from '@app/utils/date.util'


export const HolidaySchema = new Schema<IHoliday>({
  /* required fields */
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: HolidayType, required: true, lowercase: true },
  rule: {
    type: String,
    required: function () {
      return this.type === "variable"
    },
  },
  date: { type: Date, required: true },
  year: {
    type: String,
    required: true,
    validate: {
      validator: function (year) {
        return year === "*" || validateYear(year)
      },
      message: props => `${props.value} no es un año válido`
    }
  },
  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
HolidaySchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
HolidaySchema.post('save', function (doc) {
  DbLogger.info(`[Holiday][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const HolidayModel = AppMainMongooseRepo.model<IHoliday>('holiday', HolidaySchema)
