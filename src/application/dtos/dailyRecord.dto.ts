import { z } from "zod";
import { Types } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateDailyRecord:
 *       type: object
 *       required:
 *         - shedId
 *         - captureDate
 *         - foodConsumedKg
 *         - mortality
 *         - avgHensWeight
 *         - uniformity
 *       properties:
 *         shedId:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *           description: ID de la caseta a la que pertenece el registro diario
 *         captureDate:
 *           type: string
 *           format: date
 *           example: "2024-03-01"
 *           description: Fecha en la que se capturó el registro
 *         foodConsumedKg:
 *           type: number
 *           example: 150.5
 *           description: Cantidad de alimento consumido en kilogramos
 *         mortality:
 *           type: number
 *           example: 10
 *           description: Cantidad de gallinas muertas en el día
 *         avgHensWeight:
 *           type: number
 *           example: 1.8
 *           description: Peso promedio de las gallinas en kg
 *         uniformity:
 *           type: number
 *           example: 95
 *           minimum: 0
 *           maximum: 100
 *           description: Porcentaje de uniformidad de la parvada (0 a 100)
 */

export const createDailyRecord = z.object({
  shedId: z.string().refine((val) => Types.ObjectId.isValid(val), "ID de caseta inválido"),
  captureDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Fecha de captura inválida"),
  foodConsumedKg: z.number().min(0, "Debe ser mayor o igual a 0"),
  mortality: z.number().min(0, "Debe ser mayor o igual a 0"),
  avgHensWeight: z.number().min(1, "Debe de pesar más de 1 gramo"),
  uniformity: z.number().min(0).max(100, "Debe estar entre 0 y 100"),
});

export type CreateDailyRecordDTO = z.infer<typeof createDailyRecord>;
