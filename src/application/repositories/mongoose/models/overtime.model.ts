import { Schema, model } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IDepartment } from '@app/dtos/deparment.dto'
import { EOvertimeStatus, IOvertime } from '@app/dtos/overtime.dto'

export const OvertimeSchema = new Schema<IOvertime>({
  id: { type: String, required: true, trim: true, unique: true },

  hours: { type: Number, required: true },
  status: { type: String, enum: EOvertimeStatus, required: true, default: EOvertimeStatus.UNAUTHORIZED},

  employeeId: { type: String, required: true },
  employeeName: { type: String },
  startTime: { type: String, required: true },

  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
OvertimeSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
OvertimeSchema.post('save', function (doc) {
  DbLogger.info(`[Overtime][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const OvertimeModel = model<IOvertime>('overtime', OvertimeSchema)
