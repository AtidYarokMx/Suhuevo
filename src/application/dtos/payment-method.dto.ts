import { z } from "zod"
/* types */
import type { Types } from "@app/repositories/mongoose"
import type { ICommonFields } from "@app/dtos/common.dto"

export type IPaymentMethod = ICommonFields & {
  _id: Types.ObjectId
  id: string
  name: string
  description?: string
}

/* endpoint dtos */
export const createPaymentMethodBody = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
})