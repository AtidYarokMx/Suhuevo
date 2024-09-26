import type { Types } from "@app/repositories/mongoose"

/* model dtos */
export type IPersonalBonus = {
  name: string
  value: number
  taxable: boolean
  type: PersonalBonusType
  entityType: PersonalBonusEntityType
  entityId: Types.ObjectId
  enabled?: boolean
  /* html identifiers for front */
  inputId: string
  inputName: string
  /* populated */
  idEmployee: Types.ObjectId
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export enum PersonalBonusType {
  AMOUNT = "amount",
  PERCENT = "percentage"
}

export enum PersonalBonusEntityType {
  GENERAL = "bonus",
  PERSONAL = "catalog-personal-bonus"
}

/* endpoint dtos */
export type ICreatePersonalBonus = {
  _id?: Types.ObjectId
  name: string
  value: number
  taxable: boolean
  type: PersonalBonusType
  entityType: PersonalBonusEntityType
  entityId: Types.ObjectId
  enabled?: boolean
  /* html identifiers for front */
  inputId: string
  inputName: string
  /* populated */
  idEmployee: Types.ObjectId
  /* soft delete */
  active?: boolean
}