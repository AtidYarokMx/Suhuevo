import type { Model, Types } from "@app/repositories/mongoose"

/* model dtos */
export type ICatalogPersonalBonus = {
  name: string
  value: number
  taxable: boolean
  type: CatalogPersonalBonusType
  enabled: boolean
  /* html identifiers for front */
  inputId: string
  inputName: string
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export type ICatalogPersonalBonusVirtuals = {
  entityType: "catalog-personal-bonus"
}

export enum CatalogPersonalBonusType {
  AMOUNT = "amount",
  PERCENT = "percentage"
}

export type AppCatalogPersonalBonus = Model<ICatalogPersonalBonus, Record<string, unknown>, Record<string, unknown>, ICatalogPersonalBonusVirtuals>

/* endpoint dtos */
export type ICreateCatalogPersonalBonus = {
  _id?: Types.ObjectId
  name: string
  value: number
  taxable: boolean
  type: CatalogPersonalBonusType
  enabled?: boolean
  /* html identifiers for front */
  inputId: string
  inputName: string
  /* soft delete */
  active?: boolean
}