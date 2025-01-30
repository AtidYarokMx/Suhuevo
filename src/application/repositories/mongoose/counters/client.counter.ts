import { AppCounterMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { ClientCounterSchema } from '@app/repositories/mongoose/schemas/client.schema'
/* dtos */
import { ICommonCounterFields } from '@app/dtos/common.dto'

export const ClientCounterModel = AppCounterMongooseRepo.model<ICommonCounterFields>("client", ClientCounterSchema)