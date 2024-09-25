export interface IOvertime {
  id: string

  hours: number

  employeeId: string
  employeeName: string
  date: Date

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
