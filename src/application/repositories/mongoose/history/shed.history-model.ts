import { AppHistoryMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { ShedHistorySchema } from '@app/repositories/mongoose/schemas/shed.schema'
/* dtos */
import { IShed } from '@app/dtos/shed.dto'
import { ICommonHistoryFields } from '@app/dtos/common.dto'

export const ShedHistoryModel = AppHistoryMongooseRepo.model<ICommonHistoryFields<IShed>>("shed", ShedHistorySchema)