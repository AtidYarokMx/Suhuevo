import { Model } from "@app/repositories/mongoose"
import { IJob } from "./job.dto"
import { IDepartment } from "./deparment.dto"

export interface IEmployee {
  id: string
  status: EEmployeStatus
  biometricId: string

  name: string
  lastName: string
  secondLastName: string

  email: string
  phone?: string
  address?: string
  birthdate?: string
  bloodType?: string

  departmentId: string
  jobId: string
  hireDate?: string
  schedule: IEmployeSchedule
  bankAccountNumber?: string
  dailySalary: number

  mxCurp?: string
  mxRfc?: string
  mxNss?: string

  emergencyContact?: string
  emergencyPhone?: string

  jobScheme: string

  userId: string

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

type EmployeeSchedule = {
  start: string
  end: string
} | null

export interface IEmployeSchedule {
  monday: EmployeeSchedule,
  tuesday: EmployeeSchedule
  wednesday: EmployeeSchedule
  thursday: EmployeeSchedule
  friday: EmployeeSchedule
  saturday: EmployeeSchedule
  sunday: EmployeeSchedule,
}


export enum EEmployeStatus {
  ACTIVE = 'activo',
  INACTIVE = 'inactivo'
}

export interface IEmployeeMethods {
  fullname(): string
}

export interface IEmployeeVirtuals {
  department: IDepartment | null
  job: IJob | null
}

/* types */
export type AppEmployeeModel = Model<IEmployee, {}, IEmployeeMethods, IEmployeeVirtuals>