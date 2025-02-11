import { AppHistoryMongooseRepo } from '@app/repositories/mongoose';
/* schema */
import { ShedHistorySchema } from '@app/repositories/mongoose/schemas/shed.schema';
/* dtos */
import { IShed } from '@app/dtos/shed.dto';
import { ICommonHistoryFields, IShedHistory } from '@app/dtos/common.dto';

/**
 * Modelo para almacenar el historial de cambios en casetas
 */
export const ShedHistoryModel = AppHistoryMongooseRepo.model<IShedHistory>(
  "shed_history",
  ShedHistorySchema
);