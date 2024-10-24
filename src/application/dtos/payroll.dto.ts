export interface IPayroll {
  id: string
  name: string

  lines: any[]

  startDate: string
  cutoffDate: string

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
