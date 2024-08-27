export interface IJob {
  id: string

  name: string
  departmentId: string

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
