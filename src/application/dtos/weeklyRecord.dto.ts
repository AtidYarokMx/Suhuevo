import { z } from "zod";
import { Types } from "mongoose";

/**
 * DTO para crear un registro semanal
 */
export const createWeeklyRecordDTO = z.object({
  shedId: z.string().refine((val) => Types.ObjectId.isValid(val), "ID de caseta inválido"),
  weekStart: z.string(),
  weekEnd: z.string(),
  totalHensAlive: z.number().min(0, "Debe ser mayor o igual a 0"),
  totalFoodConsumedKg: z.number().min(0, "Debe ser mayor o igual a 0"),
  totalProducedBoxes: z.number().min(0, "Debe ser mayor o igual a 0"),
  totalProducedEggs: z.number().min(0, "Debe ser mayor o igual a 0"),
  totalMortality: z.number().min(0, "Debe ser mayor o igual a 0"),
  avgEggWeight: z.number().min(0, "Debe ser mayor o igual a 0"),
  avgHensWeight: z.number().min(0, "Debe ser mayor o igual a 0"),
  generationId: z.string(),
});

export type CreateWeeklyRecordDTO = z.infer<typeof createWeeklyRecordDTO>;
