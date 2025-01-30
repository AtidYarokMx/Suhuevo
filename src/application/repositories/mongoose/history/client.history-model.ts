import { AppHistoryMongooseRepo } from '@app/repositories/mongoose'
/* schema */
import { ClientHistorySchema } from '@app/repositories/mongoose/schemas/client.schema'
/* dtos */
import { IClient } from '@app/dtos/client.dto'
import { ICommonHistoryFields } from '@app/dtos/common.dto'

export const ClientHistoryModel = AppHistoryMongooseRepo.model<ICommonHistoryFields<IClient>>("client", ClientHistorySchema)