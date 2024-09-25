export interface IPayrollBonus {
  id: string
  name: string
  type: EPayrollBonusType
  
  amount?: number
  percentage?: number
  employeeIds: string[]

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export enum EPayrollBonusType {
  PERCENTAGE = 'percentage',
  AMOUNT = 'amount'
}