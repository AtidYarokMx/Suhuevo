import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IAbsence } from '@app/dtos/absence.dto'


export interface IFestiveWork {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // formato YYYY-MM-DD
  createdAt?: Date;
  updatedAt?: Date;
}

const festiveWorkSchema = new Schema<IFestiveWork>(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
  },
  {
    timestamps: true,
  }
);

/* model instance */
export const FestiveWorkModel = AppMainMongooseRepo.model<IFestiveWork>('FestiveWork', festiveWorkSchema)
