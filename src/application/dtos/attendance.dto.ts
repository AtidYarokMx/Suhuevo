
export interface IAttendance {
  id: string
  name: string

  employeeId: string
  employeeName: string
  checkInTime: string
  checkOutTime?: string

  isLate: boolean

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export type CreateAttendanceBody = {
  employeeId: string
  checkInTime: string
  checkOutTime?: string
}

export type CreateAttendanceResponse = {
  id: string
}