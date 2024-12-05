import { Schema, model } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IAbsence } from '@app/dtos/absence.dto'


export const AbsenceSchema = new Schema<IAbsence>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },

  employeeId: { type: String, required: true, trim: true },
  employeeName: { type: String },
  date: { type: String },

  isJustified: { type: Boolean, default: false },
  reason: { type: String },
  isPaid: { type: Boolean, default: false },
  paidValue: { type: Number, default: 1 },

  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
AbsenceSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
AbsenceSchema.post('save', function (doc) {
  DbLogger.info(`[Absence][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const AbsenceModel = model<IAbsence>('absence', AbsenceSchema)
