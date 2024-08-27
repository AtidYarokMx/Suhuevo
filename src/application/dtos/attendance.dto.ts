export interface IAttendance {
  id: string

  employeeId: string
  employeeName: string
  checkInTime: string

  isLate: boolean

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
