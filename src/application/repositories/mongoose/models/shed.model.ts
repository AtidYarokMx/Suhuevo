/**
 * Modelo de Casetas
 */

/* lib */
import { AppMainMongooseRepo } from '@app/repositories/mongoose'
/* history */
import { ShedHistoryModel } from '@app/repositories/mongoose/history/shed.history-model'
/* schema */
import { ShedSchema } from '@app/repositories/mongoose/schemas/shed.schema'
/* utils */
import { calculateWeeksFromDate } from '@app/utils/date.util'
/* dtos */
import type { AppShedModel, IShed } from '@app/dtos/shed.dto'

/**
 * @swagger
 * components:
 *   schemas:
 *     Shed:
 *       type: object
 *       required:
 *         - _id
 *         - name
 *         - description
 *         - shedNumber
 *         - farm
 *         - ageWeeks
 *         - initialHensCount
 *         - avgHensWeight
 *         - generationId
 *         - status
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         _id:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *           description: Identificador único de la caseta
 *         name:
 *           type: string
 *           example: "Caseta Norte"
 *           description: Nombre de la caseta
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
 *         ageWeeks:
 *           type: number
 *           example: 10
 *           description: Edad en semanas de la parvada en producción
 *         initialHensCount:
 *           type: number
 *           example: 20000
 *           description: Número inicial de gallinas en la caseta
 *         avgHensWeight:
 *           type: number
 *           example: 1.5
 *           description: Peso promedio de las gallinas en kg
 *         generationId:
 *           type: string
 *           example: "20240221"
 *           description: Identificador único de la generación actual de la caseta
 *         status:
 *           $ref: "#/components/schemas/ShedStatus"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-02-21T10:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-01T15:30:00Z"
 */


/* virtuals */
ShedSchema.virtual("inventory", {
  ref: "inventory",
  localField: "_id",
  foreignField: "shed",
  justOne: true
})

/* pre (middlewares) */
ShedSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/* post (middlewares) */
ShedSchema.post('save', async function (doc) {
  const history = new ShedHistoryModel({
    change: { ...doc },
    updatedBy: doc.lastUpdateBy
  })
  await history.save()
})

/* model instance */
export const ShedModel = AppMainMongooseRepo.model<IShed, AppShedModel>("shed", ShedSchema)