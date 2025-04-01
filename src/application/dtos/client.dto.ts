import type { ICommonFields } from "@app/dtos/common.dto"
import type { Types } from "@app/repositories/mongoose"
import { z } from "zod"

export type IClient = ICommonFields & {
  _id: Types.ObjectId
  id: string
  name: string
  firstLastName: string
  secondLastName?: string
  email: string
  address: string
  phone: string
  rfc?: string
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  creditLimit?: number
  creditUsed?: number
}

/* endpoint dtos */
export const createClientBody = z.object({
  name: z.string().trim().min(1),
  firstLastName: z.string().trim().min(1),
  secondLastName: z.string().trim().min(1).optional(),
  email: z.string().email(),
  address: z.string().min(1),
  phone: z.string().min(1).max(15),
  rfc: z.string().min(12).max(13).optional(),
  businessName: z.string().min(1).optional(),
  businessAddress: z.string().min(1).optional(),
  businessPhone: z.string().min(1).max(15).optional(),
})

export const updateClientBody = z.object({
  name: z.string().trim().min(1).optional(),
  firstLastName: z.string().trim().min(1).optional(),
  secondLastName: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).max(15).optional(),
  rfc: z.string().min(12).max(13).optional(),
  businessName: z.string().min(1).optional(),
  businessAddress: z.string().min(1).optional(),
  businessPhone: z.string().min(1).max(15).optional(),
})