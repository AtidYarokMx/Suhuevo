
export interface ISelect {
  id: string
  name: string
  options: ISelectOption[]
  /* defaults */
  active: boolean
  createdAt: Date
}

export interface ISelectOption {
  id: string
  name: string
}
