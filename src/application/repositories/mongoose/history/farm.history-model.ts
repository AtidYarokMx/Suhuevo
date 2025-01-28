import { AppHistoryMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { FarmHistorySchema } from '@app/repositories/mongoose/schemas/farm.schema'
/* dtos */
import { IFarm } from '@app/dtos/farm.dto'
import { ICommonHistoryFields } from '@app/dtos/common.dto'

export const FarmHistoryModel = AppHistoryMongooseRepo.model<ICommonHistoryFields<IFarm>>("farm", FarmHistorySchema)