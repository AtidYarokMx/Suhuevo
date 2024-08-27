export interface IAbsence {
  id: string

  employeeId: string
  employeeName: string
  date: string

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
