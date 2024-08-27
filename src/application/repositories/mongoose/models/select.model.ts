import { type ISelect } from '@app/dtos/select.dto'
import { Schema, model } from '@app/repositories/mongoose'

export const SelectSchema = new Schema<ISelect>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  options: { type: [Object], required: true, trim: true },
  /* defaults */
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/* model instance */
export const SelectModel = model<ISelect>('select', SelectSchema)
