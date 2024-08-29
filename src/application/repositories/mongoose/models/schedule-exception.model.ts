import { Schema, model } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IScheduleException } from '@app/dtos/schedule-exception.dto'


export const ScheduleExceptionSchema = new Schema<IScheduleException>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },
  employeeNumber: { type: String },
  employeeId: { type: String },
  name: { type: String, required: true, trim: true },
  reason: { type: String, trim: true },

  approved: { type: Boolean, default: false },
  allDay: { type: Boolean, default: false },

  startDate: { type: String },
  endDate: { type: String },

  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})


/* post (middlewares) */
ScheduleExceptionSchema.post('save', function (doc) {
  DbLogger.info(`[Schedule exception][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const ScheduleExceptionModel = model<IScheduleException>('schedule-exception', ScheduleExceptionSchema)
