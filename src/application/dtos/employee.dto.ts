import { Model, Types } from "@app/repositories/mongoose"
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
  bankName?: string
  bankAccountNumber?: string
  dailySalary: number

  mxCurp?: string
  mxRfc?: string
  mxNss?: string

  emergencyContact?: string
  emergencyPhone?: string

  jobScheme: string
  attendanceScheme: EEmployeeAttendanceScheme

  userId: string

  /* files */
  ineFront: Types.ObjectId
  ineBack: Types.ObjectId
  contract: Types.ObjectId

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

export enum EEmployeeAttendanceScheme {
  CLOCK_IN_OUT = "clock_in_out",
  AUTOMATIC = "automatic"
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

/* endpoint types */
export type AppUpdateBody = Omit<IEmployee, "createdAt" | "updatedAt" | "active"> & {
  schedule: string
  dailySalary: string
}