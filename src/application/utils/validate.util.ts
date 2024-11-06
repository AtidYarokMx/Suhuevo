import { z } from 'zod'
/* types */
import { Types } from '@app/repositories/mongoose'

export function validateObjectId(id: string) {
  const schema = z.string().refine(val => Types.ObjectId.isValid(val), (val) => ({ message: `${val} debe ser un ObjectId válido` }))
  return schema.parse(id)
}