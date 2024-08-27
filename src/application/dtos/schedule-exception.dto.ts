export interface IScheduleException {
  id: string
  employeeNumber: string
  employeeId: string
  name: string
  reason: string

  approved: boolean
  allDay: boolean

  startDate: string
  endDate: string

  /* defaults */
  active: boolean
  createdAt: Date
}
