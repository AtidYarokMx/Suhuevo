/* mongoose dtos */
export type IHoliday = {
  name: string
  type: "fixed" | "variable"
  date: Date
  rule?: string
  year?: string
  /* defaults */
  active: boolean
  updatedAt: Date
  createdAt: Date
}

/* endpoint dtos */
export type ICreateBody = {
  name: string
  type: "fixed" | "variable"
  date: Date
  rule?: string
  year?: string
}