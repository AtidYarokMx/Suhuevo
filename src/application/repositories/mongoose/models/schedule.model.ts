// import { Schema, model } from '@app/repositories/mongoose'
// import { DbLogger } from '@app/handlers/loggers/db.logger'
// import { ISchedule } from '@app/dtos/schedule.dto'


// export const ScheduleSchema = new Schema<ISchedule>({
//   /* required fields */
//   id: { type: String, required: true, trim: true, unique: true },

//   name: { type: String, required: true, trim: true },

//   events: { type: [Object], default: [] },

//   /* defaults */
//   active: { type: Boolean, default: true },
//   updatedAt: { type: Date, default: () => Date.now() },
//   createdAt: { type: Date, default: () => Date.now(), immutable: true }
// })

// /* pre (middlewares) */
// ScheduleSchema.pre('save', async function (next) {
//   this.updatedAt = new Date(Date.now())
//   next()
// })

// /* post (middlewares) */
// ScheduleSchema.post('save', function (doc) {
//   DbLogger.info(`[Schedule][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
// })

// /* model instance */
// export const ScheduleModel = model<ISchedule>('schedule', ScheduleSchema)
