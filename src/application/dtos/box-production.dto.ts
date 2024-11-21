import { Types } from "@app/repositories/mongoose"

export type IBoxProduction = {
  id: number
  farm: Types.ObjectId
  shed: Types.ObjectId
  code: string
  weight: number
  type: number
  status: number
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}