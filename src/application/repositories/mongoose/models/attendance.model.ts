import { Schema, model } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IAttendance } from '@app/dtos/attendance.dto'


export const AttendanceSchema = new Schema<IAttendance>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },
  name: { type: String },

  employeeId: { type: String, required: true, trim: true },
  employeeName: { type: String },
  checkInTime: { type: String, required: true },

  isLate: { type: Boolean, default: false },
  
  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
AttendanceSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
AttendanceSchema.post('save', function (doc) {
  DbLogger.info(`[Attendance][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const AttendanceModel = model<IAttendance>('attendance', AttendanceSchema)
