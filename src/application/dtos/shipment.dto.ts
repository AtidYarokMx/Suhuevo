/* types */
import { ICommonFields } from '@app/dtos/common.dto'
import { Types } from '@app/repositories/mongoose'

export type IShipment = ICommonFields & {
  name: string
  description?: string
  codes: Types.ObjectId[]
}
