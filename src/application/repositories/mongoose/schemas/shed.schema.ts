import { Model, Schema, SchemaTypes } from '@app/repositories/mongoose';
/* dtos */
import { type AppShedModel, type IShed, type IShedVirtuals, ShedStatus } from '@app/dtos/shed.dto';
import type { ICommonHistoryFields, IShedHistory } from '@app/dtos/common.dto';
import { isValidStatusChange } from '@app/utils/validate.util';

/**
 * @swagger
 * components:
 *   schemas:
 *     ShedSchema:
 *       type: object
 *       required:
 *         - shedNumber
 *         - name
 *         - farm
 *         - description
 *         - week
 *         - ageWeeks
 *         - initialHensCount
 *         - avgHensWeight
 *         - generationId
 *         - status
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         shedNumber:
 *           type: number
 *           example: 1
 *           description: Número de la caseta dentro de la granja
 *         name:
 *           type: string
 *           example: "Caseta Norte"
 *         farm:
 *           type: string
 *           example: "65fbf3214abc9876def91235"
 *         description:
 *           type: string
 *           example: "Caseta ubicada en la zona norte de la granja"
 *         week:
 *           type: number
 *           example: 5
 *           description: Semana actual de producción
 *         ageWeeks:
 *           type: number
 *           example: 10
 *           description: Edad en semanas de la parvada en producción
 *         initialHensCount:
 *           type: number
 *           example: 20000
 *         avgHensWeight:
 *           type: number
 *           example: 1.5
 *         generationId:
 *           type: string
 *           example: "20240221"
 *         status:
 *           $ref: "#/components/schemas/ShedStatus"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export const ShedSchema = new Schema<IShed, AppShedModel, {}, {}, IShedVirtuals>({
  shedNumber: { type: Number, required: true, immutable: true },
  name: { type: String, trim: true, required: true },
  farm: { type: Schema.Types.ObjectId, ref: "farm", required: true },
  description: { type: String, trim: true, required: true },
  week: { type: Number, default: 1 },
  ageWeeks: { type: Number, default: 0 },
  initialHensCount: { type: Number, required: true, default: 0 },
  avgHensWeight: { type: Number, required: true, default: 0 },
  generationId: {
    type: String,
    default: () => `${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${new Date().getDate().toString().padStart(2, "0")}`
  },
  status: {
    type: String,
    enum: Object.values(ShedStatus),
    default: ShedStatus.INACTIVE,
    validate: {
      validator: function (newStatus: string) {
        // Si es una nueva caseta, no se valida el cambio de estado
        if ((this as any).isNew) return true;
        return this.status.includes(newStatus as ShedStatus);
      },
      message: "Cambio de estado no permitido",
    },
    lastUpdateBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  active: { type: Boolean, default: true },
  createdBy: { type: SchemaTypes.ObjectId, ref: "user", required: true, immutable: true },
  lastUpdateBy: { type: SchemaTypes.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: () => Date.now(), immutable: true },
  updatedAt: { type: Date, default: () => Date.now() },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

/**
 * @swagger
 * components:
 *   schemas:
 *     ShedHistory:
 *       type: object
 *       required:
 *         - shedId
 *         - generationId
 *         - change
 *         - updatedAt
 *         - updatedBy
 *       properties:
 *         shedId:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *         generationId:
 *           type: string
 *           example: "20240221"
 *         change:
 *           type: object
 *           example: { "status": "production", "totalProducedEggs": 100000 }
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-02-28T14:00:00Z"
 *         updatedBy:
 *           type: string
 *           example: "65fbf3214abc9876def91238"
 */

export const ShedHistorySchema = new Schema<IShedHistory>({
  shedId: { type: Schema.Types.ObjectId, ref: "shed" },
  generationId: { type: String },
  change: { type: Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
}, { timestamps: true });