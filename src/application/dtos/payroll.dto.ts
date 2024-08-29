export interface IPayroll {
  id: string
  name: string

  lines: any[]

  startDate: Date
  cutoffDate: Date

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
