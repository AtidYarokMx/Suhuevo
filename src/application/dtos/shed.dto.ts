import { z } from "zod"
/* types */
import { Model, Types } from "@app/repositories/mongoose"
import { IInventory } from "@app/dtos/inventory.dto"
import { ICommonFields } from "@app/dtos/common.dto"

export enum ShedStatus {
  ACTIVE = "active",
  PELECHA = "pelecha",
  INACTIVE = "inactive",
}

export type IShed = ICommonFields & {
  _id: Types.ObjectId
  /* fields */
  name: string
  description: string
  week: number
  period: number
  initialChicken: number
  shedNumber?: number
  /* enums */
  status: ShedStatus
  /* relations */
  farm: Types.ObjectId
}

export type IShedVirtuals = {
  inventory: IInventory[]
}

export type AppShedModel = Model<IShed, {}, {}, IShedVirtuals>

/* endpoint dtos */
export const createShed = z.object({
  name: z.string(),
  description: z.string(),
  initialChicken: z.number().default(0),
  farm: z.string().refine(val => Types.ObjectId.isValid(val), (val) => ({ message: `${val} debe ser un ObjectId válido` })),
  shedNumber: z.number().gt(0, "shedNumber debe ser mayor a 0").optional()
})

export const updateShed = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  farm: z.string().refine(val => Types.ObjectId.isValid(val), (val) => ({ message: `${val} debe ser un ObjectId válido` })).optional(),
  shedNumber: z.number().gt(0, "shedNumber debe ser mayor a 0").optional()
})

export type createShedBody = z.infer<typeof createShed>
export type updateShedBody = z.infer<typeof updateShed>