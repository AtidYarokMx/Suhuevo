
import { ISequence } from '@app/dtos/sequence.dto'
import { Schema, model } from '@app/repositories/mongoose'

export const SequenceSchema = new Schema<ISequence>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  value: { type: Number, default: 1 },
  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* pre (middlewares) */
SequenceSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* model instance */
export const SequenceModel = model<ISequence>('sequence', SequenceSchema)
