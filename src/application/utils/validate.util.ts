import { z } from 'zod'
/* types */
import { Types } from '@app/repositories/mongoose'

export function validateObjectId(id: string) {
  const schema = z.string({ message: "El formato del id es incorrecto" }).refine(val => Types.ObjectId.isValid(val), (val) => ({ message: `${val} debe ser un ObjectId válido` }))
  return schema.parse(id)
}

export function validateBarcode(code: string) {
  const schema = z.string().length(21)
  return schema.parse(code)
}