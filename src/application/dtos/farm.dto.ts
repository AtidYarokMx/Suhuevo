import { z } from 'zod'
/* types */
import { IShed } from "@app/dtos/shed.dto"
import { Model, Types } from "@app/repositories/mongoose"
import { ICommonFields } from '@app/dtos/common.dto'

export enum FarmStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export type IFarm = ICommonFields & {
  _id: Types.ObjectId
  /* fields */
  name: string
  description: string
  farmNumber?: number
  /* enums */
  status: FarmStatus
}

export type IFarmVirtuals = {
  sheds: IShed[]
}

export type AppFarmModel = Model<IFarm, {}, {}, IFarmVirtuals>

/* endpoint dtos */
export const createFarm = z.object({
  name: z.string(),
  description: z.string(),
  farmNumber: z.number().gt(0, "farmNumber debe ser mayor a 0").optional()
})

export const updateFarm = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(FarmStatus, { message: "El status ingresado no es válido." }).optional(),
  farmNumber: z.number().gt(0, "farmNumber debe ser mayor a 0").optional()
})

export type createFarmBody = z.infer<typeof createFarm>
export type updateFarmBody = z.infer<typeof updateFarm>