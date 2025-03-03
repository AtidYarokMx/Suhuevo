import { z } from "zod";
/* types */
import { Model, Types } from "@app/repositories/mongoose";
import { IInventory } from "@app/dtos/inventory.dto";
import { ICommonFields } from "@app/dtos/common.dto";

/**
 * @swagger
 * components:
 *   schemas:
 *     ShedStatus:
 *       type: string
 *       enum: [inactive, cleaning, readyToProduction, production]
 *       description: Estados de una caseta en el sistema
 *
 *     CreateShed:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - shedNumber
 *         - farm
 *       properties:
 *         name:
 *           type: string
 *           example: "Caseta Norte"
 *         description:
 *           type: string
 *           example: "Caseta ubicada en la zona norte de la granja"
 *         shedNumber:
 *           type: number
 *           example: 1
 *           description: Número de la caseta dentro de la granja
 *         farm:
 *           type: string
 *           example: "65fbf3214abc9876def91235"
 *           description: ID de la granja a la que pertenece la caseta
 *
 *     InitializeShed:
 *       type: object
 *       required:
 *         - initialHensCount
 *         - birthDate
 *         - avgHensWeight
 *       properties:
 *         initialHensCount:
 *           type: number
 *           example: 20000
 *           description: Cantidad de gallinas iniciales en la caseta
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "2024-02-21"
 *           description: Fecha de nacimiento de las gallinas
 *         avgHensWeight:
 *           type: number
 *           example: 1.5
 *           description: Peso promedio de las gallinas en kg
 *
 *     UpdateShed:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Caseta Sur"
 *         description:
 *           type: string
 *           example: "Caseta en la zona sur de la granja"
 *         ageWeeks:
 *           type: number
 *           example: 12
 *           description: Edad en semanas de la parvada
 *         avgHensWeight:
 *           type: number
 *           example: 1.8
 *           description: Peso promedio de las gallinas en kg
 *         farm:
 *           type: string
 *           example: "65fbf3214abc9876def91235"
 *         shedNumber:
 *           type: number
 *           example: 2
 *         status:
 *           $ref: "#/components/schemas/ShedStatus"
 *         generationId:
 *           type: string
 *           example: "20240221"
 */

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
  shedNumber?: number;
  name: string;
  farm: Types.ObjectId;
  description: string;
  week: number;
  ageWeeks: number;
  initialHensCount: number;
  avgHensWeight: number,
  generationId: string;
  status: ShedStatus;
  createdAt: Date;
  updatedAt: Date;
};


/**
 * Virtuals para una caseta
 */
export type IShedVirtuals = {
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
  initialHensCount: z.number().min(1, "Debe haber al menos una gallina"),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val))),
  avgHensWeight: z.number().min(1, "Debe de pesar mas de 1 gramo"),

});

/**
 * DTO para actualizar una caseta
 */
export const updateShed = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  ageWeeks: z.number().gt(0, "ageWeeks debe ser mayor a 0").optional(),
  avgHensWeight: z.number().gt(0, "avgHensWeight debe ser mayor a 0").optional(),
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