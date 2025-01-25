/* lib */
import { z } from 'zod'

export type IEggType = {
  id: number
  name: string
  description?: string
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

/* endpoint dtos */
export const createEggType = z.object({
  id: z.number().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional()
})