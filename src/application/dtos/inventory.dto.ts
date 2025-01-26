import { z } from 'zod'
/* types */
import { Types } from "@app/repositories/mongoose"
import { ICommonFields } from "@app/dtos/common.dto"

export type IInventory = ICommonFields & {
  date: Date
  chicken: number
  mortality: number
  water: number
  food: number
  /* relations */
  shed: Types.ObjectId
}

/* endpoint dtos */
export const createInventory = z.object({
  date: z.string({ message: "El campo 'date' es requerido." }).date("Se debe ingresar un formato de fecha válido en formato YYYY-MM-DD."),
  chicken: z.number({ message: "El campo 'chicken' es requerido." }).gte(0, "Se debe ingresar una cantidad igual o mayor a 0"),
  mortality: z.number({ message: "El campo 'mortality' es requerido." }).gte(0, "Se debe ingresar una cantidad igual o mayor a 0").optional(),
  water: z.number({ message: "El campo 'water' es requerido." }).gte(0, "Se debe ingresar una cantidad igual o mayor a 0"),
  food: z.number({ message: "El campo 'food' es requerido." }).gte(0, "Se debe ingresar una cantidad igual o mayor a 0"),
  shed: z.string({ message: "El campo 'shed' es requerido." }).refine(val => Types.ObjectId.isValid(val), (val) => ({ message: `${val} debe ser un ObjectId válido` }))
})

export const updateInventory = z.object({
  date: z.string({ message: "El campo 'date' no tiene el formatio correcto." }).date("Se debe ingresar un formato de fecha válido en formato YYYY-MM-DD.").optional(),
  chicken: z.number({ message: "El campo 'chicken' no tiene el formatio correcto." }).gte(0, "Se debe ingresar una cantidad igual o mayor a 0").optional(),
  mortality: z.number({ message: "El campo 'mortality' es requerido." }).gte(0, "Se debe ingresar una cantidad igual o mayor a 0").optional(),
  water: z.number({ message: "El campo 'water' no tiene el formatio correcto." }).gte(0, "Se debe ingresar una cantidad igual o mayor a 0").optional(),
  food: z.number({ message: "El campo 'food' no tiene el formatio correcto." }).gte(0, "Se debe ingresar una cantidad igual o mayor a 0").optional(),
})

export type createInventoryBody = z.infer<typeof createInventory>
export type updateInventoryBody = z.infer<typeof updateInventory>