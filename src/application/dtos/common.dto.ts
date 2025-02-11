import { Types } from "@app/repositories/mongoose"
import { IShed } from "./shed.dto"

export type ICommonFields = {
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
  lastUpdateBy: Types.ObjectId
  createdBy: Types.ObjectId
}

export type ICommonCounterFields = {
  _id: Types.ObjectId
  id: string
  value: number
}

export type ICommonCatalogFields<T = void> = T & ICommonFields & {
  _id: Types.ObjectId
  id: string
  name: string
  description?: string
}

/**
 * Interfaz para almacenar los cambios históricos de cualquier modelo.
 */
export interface ICommonHistoryFields<T> {
  change: T; // Guarda un snapshot del modelo antes del cambio
  updatedAt: Date;
  updatedBy: Types.ObjectId;
}

/**
 * Interfaz específica para el historial de casetas.
 */
export interface IShedHistory extends ICommonHistoryFields<IShed> {
  shedId: Types.ObjectId;
  generationId: string;
}