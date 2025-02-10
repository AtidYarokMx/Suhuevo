/* lib */
import { z } from 'zod'
/* types */
import { Types } from "@app/repositories/mongoose"

export type IBoxProduction = {
  _id: Types.ObjectId
  id: number
  farmNumber: number
  shedNumber: number
  farm?: Types.ObjectId
  shed?: Types.ObjectId
  code: string
  weight: number
  type: number
  status: number
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

/* raw query */
export type IBoxProductionSequelize = {
  id: number
  id_granja: number
  id_caceta: number
  codigo: string
  peso: string
  tipo: number
  status: number
  creacion: Date
  actualizacion: Date
}

/* endpoints dtos */
export const sendBoxesToSellsBody = z.object({
  codes: z.array(z.string())
})

/* catalog box */
export const createBoxTypeBody = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
})