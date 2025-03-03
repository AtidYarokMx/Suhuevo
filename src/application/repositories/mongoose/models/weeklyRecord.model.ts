import { Schema, Document, Types, SchemaTypes } from "mongoose";
import { AppMainMongooseRepo } from "..";

/**
 * @swagger
 * components:
 *   schemas:
 *     WeeklyRecord:
 *       type: object
 *       required:
 *         - shedId
 *         - weekStart
 *         - weekEnd
 *         - totalHensAlive
 *         - totalFoodConsumedKg
 *         - totalProducedBoxes
 *         - totalProducedEggs
 *         - totalMortality
 *         - avgEggWeight
 *         - avgHensWeight
 *         - generationId
 *       properties:
 *         shedId:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *           description: ID de la caseta a la que pertenece el registro
 *         weekStart:
 *           type: string
 *           format: date
 *           example: "2024-03-01"
 *           description: Fecha de inicio de la semana
 *         weekEnd:
 *           type: string
 *           format: date
 *           example: "2024-03-07"
 *           description: Fecha de finalización de la semana
 *         totalHensAlive:
 *           type: number
 *           example: 19000
 *           description: Número total de gallinas vivas al final de la semana
 *         totalFoodConsumedKg:
 *           type: number
 *           example: 1100
 *           description: Total de alimento consumido en la semana en kilogramos
 *         totalProducedBoxes:
 *           type: number
 *           example: 150
 *           description: Número total de cajas de huevos producidas en la semana
 *         totalProducedEggs:
 *           type: number
 *           example: 45000
 *           description: Número total de huevos producidos en la semana
 *         totalMortality:
 *           type: number
 *           example: 20
 *           description: Número de gallinas muertas en la semana
 *         avgEggWeight:
 *           type: number
 *           example: 62
 *           description: Peso promedio de los huevos en gramos
 *         avgHensWeight:
 *           type: number
 *           example: 1.75
 *           description: Peso promedio de las gallinas en kg
 *         generationId:
 *           type: string
 *           example: "20240301"
 *           description: Identificador único de la generación de gallinas
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-07T12:00:00Z"
 *           description: Fecha y hora de creación del registro
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-07T12:30:00Z"
 *           description: Fecha y hora de la última actualización
 */

/**
 * Interfaz para los registros semanales
 */
export interface IWeeklyRecord extends Document {
  shedId: Types.ObjectId;
  weekStart: Date;
  weekEnd: Date;
  totalHensAlive: number;
  totalFoodConsumedKg: number;
  totalProducedBoxes: number;
  totalProducedEggs: number;
  totalMortality: number;
  totalNetWeight: number;
  avgEggWeight: number;
  avgHensWeight: number;
  generationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Esquema de los registros semanales
 */
const WeeklyRecordSchema = new Schema<IWeeklyRecord>(
  {
    shedId: { type: SchemaTypes.ObjectId, ref: "Shed", required: true, index: true },
    weekStart: { type: Date, required: true, index: true },
    weekEnd: { type: Date, required: true },
    totalHensAlive: { type: Number, required: true, default: 0 },
    totalFoodConsumedKg: { type: Number, required: true, default: 0 },
    totalProducedBoxes: { type: Number, required: true, default: 0 },
    totalProducedEggs: { type: Number, required: true, default: 0 },
    totalMortality: { type: Number, required: true, default: 0 },
    totalNetWeight: { type: Number, required: true, default: 0 },
    avgEggWeight: { type: Number, required: true, default: 0 },
    avgHensWeight: { type: Number, required: true, default: 0 },
    generationId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export const WeeklyRecordModel = AppMainMongooseRepo.model<IWeeklyRecord>("WeeklyRecord", WeeklyRecordSchema);
