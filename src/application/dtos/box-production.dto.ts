/* lib */
import { z } from 'zod'
/* types */
import { Types } from "@app/repositories/mongoose"

/**
 * 📌 Modelo de Producción de Cajas en MongoDB
 */
export type IBoxProduction = {
  _id: Types.ObjectId
  farmNumber: number
  shedNumber: number
  farm: Types.ObjectId
  shed: Types.ObjectId
  code: string
  grossWeight: number
  netWeight: number
  avgEggWeight: number
  type: Types.ObjectId
  totalEggs: Number
  status: number
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

/**
 * 📌 Modelo de Producción de Cajas en SQL Server (Raw Query)
 */
export type IBoxProductionSequelize = {
  id: number | null
  id_granja: number
  id_caceta: number
  codigo: string
  peso: string
  tipo: number
  status: number
  creacion: Date
  actualizacion: Date
}

/**
 * 📌 DTO para enviar cajas a ventas
 */
export const sendBoxesToSellsBody = z.object({
  codes: z.array(z.string().trim().min(1, "Código inválido")), // 🔹 Validación para evitar códigos vacíos
  plates: z.string().trim().min(1, "Las placas son requeridas"),
  driver: z.string().trim().min(1, "El nombre del conductor es requerido")
})

/**
 * 📌 DTO para crear tipos de caja
 */
export const createBoxTypeBody = z.object({
  id: z.string().trim().min(1, "El ID es requerido"),
  name: z.string().trim().min(1, "El nombre es requerido"),
  description: z.string().trim().optional(),
  tare: z.number().min(0, "El peso de tara debe ser un numero positivo")
})