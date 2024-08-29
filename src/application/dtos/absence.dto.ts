export interface IAbsence {
  id: string

  employeeId: string
  employeeName: string
  date: string

  isJustified: boolean;
  reason: string;
  isPaid: boolean;

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
