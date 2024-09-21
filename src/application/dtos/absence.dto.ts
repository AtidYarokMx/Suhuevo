export interface IAbsence {
  id: string

  employeeId: string
  employeeName: string
  date: Date

  isJustified: boolean;
  reason: string;
  isPaid: boolean;

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
