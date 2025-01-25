import { Types } from "@app/repositories/mongoose"

export type IBoxProduction = {
  id: number
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