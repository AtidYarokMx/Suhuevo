export interface IAbsence {
  id: string

  employeeId: string
  employeeName: string
  date: string

  isJustified: boolean;
  reason: string;
  isPaid: boolean;
  paidValue: number

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
