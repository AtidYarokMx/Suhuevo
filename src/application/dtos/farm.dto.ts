import { z } from 'zod'
/* types */
import { IShed } from "@app/dtos/shed.dto"
import { Model, Types } from "@app/repositories/mongoose"

export enum FarmStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export type IFarm = {
  _id: Types.ObjectId
  /* fields */
  name: string
  description: string
  /* enums */
  status: FarmStatus
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export type IFarmVirtuals = {
  sheds: IShed[]
}

export type AppFarmModel = Model<IFarm, {}, {}, IFarmVirtuals>

/* endpoint dtos */
export const createFarm = z.object({
  name: z.string(),
  description: z.string()
})

export const updateFarm = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(FarmStatus, { message: "El status ingresado no es válido." }).optional(),
})

export type createFarmBody = z.infer<typeof createFarm>
export type updateFarmBody = z.infer<typeof updateFarm>