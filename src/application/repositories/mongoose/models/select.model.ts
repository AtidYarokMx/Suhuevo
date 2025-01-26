import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
/* dtos */
import { type ISelect } from '@app/dtos/select.dto'

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
export const SelectModel = AppMainMongooseRepo.model<ISelect>('select', SelectSchema)
