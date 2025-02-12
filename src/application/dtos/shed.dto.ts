import { z } from "zod";
/* types */
import { Model, Types } from "@app/repositories/mongoose";
import { IInventory } from "@app/dtos/inventory.dto";
import { ICommonFields } from "@app/dtos/common.dto";

/**
 * Enumeración de los estados permitidos para las casetas (Sheds)
 */
export enum ShedStatus {
  INACTIVE = "inactive",
  CLEANING = "cleaning",
  READY_TO_PRODUCTION = "readyToProduction",
  PRODUCTION = "production",
}

/**
 * Interfaz para una caseta (Shed)
 */
export type IShed = ICommonFields & {
  _id: Types.ObjectId;
  /* fields */
  name: string;
  description: string;
  week: number;
  period: number;
  chickenWeight: number;
  initialChicken: number;
  avgEggWeight: number;
  foodConsumed: number;
  waterConsumed: number;
  mortality: number;
  eggProduction: number;
  shedNumber?: number;
  generationId: string;
  ageWeeks: number;
  /* enums */
  status: ShedStatus;
  /* relations */
  farm: Types.ObjectId;
};


/**
 * Virtuals para una caseta
 */
export type IShedVirtuals = {
  chickenAge: number;
  inventory: IInventory[];
};

/**
 * Modelo de la caseta
 */
export type AppShedModel = Model<IShed, {}, {}, IShedVirtuals>;

/* ========================= */
/*       ENDPOINT DTOS       */
/* ========================= */

/**
 * DTO para crear una caseta
 */
export const createShed = z.object({
  name: z.string(),
  description: z.string(),
  shedNumber: z.number().gt(0, "shedNumber debe ser mayor a 0"),
  farm: z.string().refine(
    (val) => Types.ObjectId.isValid(val),
    (val) => ({ message: `${val} debe ser un ObjectId válido` })
  ),
});

/**
 * DTO para inicializar una caseta con datos de producción
 */
export const initializeShed = z.object({
  initialChicken: z.number().min(1, "Debe haber al menos una gallina"),
  avgHenWeight: z.number().min(1, "Debe de pesar mas de 1 gramo"),
  ageWeeks: z.number().default(0),
  generationId: z.string().optional(),
});

/**
 * DTO para actualizar una caseta
 */
export const updateShed = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  weeksChicken: z.number().gt(0, "weeksChicken debe ser mayor a 0").optional(),
  chickenWeight: z.number().gt(0, "chickenWeight debe ser mayor a 0").optional(),
  avgEggWeight: z.number().gt(0, "avgEggWeight debe ser mayor a 0").optional(),
  foodConsumed: z.number().gt(0, "foodConsumed debe ser mayor a 0").optional(),
  waterConsumed: z.number().gt(0, "waterConsumed debe ser mayor a 0").optional(),
  mortality: z.number().gt(0, "mortality debe ser mayor a 0").optional(),
  farm: z.string()
    .refine((val) => Types.ObjectId.isValid(val), (val) => ({ message: `${val} debe ser un ObjectId válido` }))
    .optional(),
  shedNumber: z.number().gt(0, "shedNumber debe ser mayor a 0").optional(),
  status: z.nativeEnum(ShedStatus).optional(),
  generationId: z.string().optional()
});

/**
 * Tipos inferidos de los DTOs
 */
export type createShedBody = z.infer<typeof createShed>;
export type initializeShedBody = z.infer<typeof initializeShed>;
export type updateShedBody = z.infer<typeof updateShed>;