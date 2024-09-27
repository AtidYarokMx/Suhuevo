import type { Model, Types } from "@app/repositories/mongoose"

/* model dtos */
export type IBonus = {
  name: string
  value: number
  taxable: boolean
  type: BonusType
  enabled?: boolean
  /* html identifiers for front */
  inputId: string
  inputName: string
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export type IAppBonusVirtuals = {
  entityType: "bonus"
}

export enum BonusType {
  AMOUNT = "amount",
  PERCENT = "percentage"
}

export type AppBonus = Model<IBonus, {}, {}, IAppBonusVirtuals>

/* endpoint dtos */
export type ICreateBonus = {
  _id?: Types.ObjectId
  name: string
  value: number
  taxable: boolean
  type: BonusType
  enabled?: boolean
  /* html identifiers for front */
  inputId: string
  inputName: string
  /* soft delete */
  active?: boolean
}