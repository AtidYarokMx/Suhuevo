import { z } from 'zod'
/* types */
import { Types } from "@app/repositories/mongoose"

export type ISalesInventory = {
  shed: Types.ObjectId
  code: string
  weight: number
  type: number
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

/* endpoints dtos */
export const sendBoxesToSellsBody = z.object({
  codes: z.array(z.string().length(21)),
  shed: z.string().refine(val => Types.ObjectId.isValid(val), (val) => ({ message: `${val} debe ser un ObjectId válido` })),
})