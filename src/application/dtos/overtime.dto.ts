export interface IOvertime {
  id: string

  startTime: Date
  hours: number
  status: EOvertimeStatus

  employeeId: string
  employeeName: string

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export enum EOvertimeStatus {
  UNAUTHORIZED = 'unauthorized',
  AUTHORIZED = 'authorized'
}
