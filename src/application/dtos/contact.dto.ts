export interface IContact {
  id: string
  name: string
  // firstLastName: string
  // secondLastName: string

  phone: string
  email: string
  whatsappNumber: string

  companyId: string
  linkId: string

  status: EContactStatus
  active: boolean
  updatedAt: Date
  createdAt: Date
}

export interface IContactMethods {
  fullname: () => string
}

export enum EContactStatus {
  ACTIVE = 'activo',
  INACTIVE = 'inactivo'
}
