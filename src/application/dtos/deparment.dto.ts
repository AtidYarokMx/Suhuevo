export interface IDepartment {
  id: string

  name: string
  managerId: string

  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}
