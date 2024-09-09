export interface IEmployee {
  id: string
  status: EEmployeStatus

  name: string
  lastName: string
  secondLastName: string

  email: string
  phone: string
  address: string
  birthdate: string
  bloodType: string

  departmentId: string
  jobId: string
  hireDate: string
  schedule: IEmployeSchedule
  bankAccountNumber: string
  dailySalary: number
  
  mxCurp?: string
  mxRfc?: string
  mxNss?: string

  emergencyContact: string
  emergencyPhone: string

  jobScheme: string

  userId: string

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export interface IEmployeSchedule {
  monday: any,
  tuesday: any
  wednesday: any
  thursday: any
  friday: any
  saturday: any
  sunday: any,
}


export enum EEmployeStatus {
  ACTIVE = 'activo',
  INACTIVE = 'inactivo'
}
