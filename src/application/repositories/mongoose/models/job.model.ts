import { Schema, AppMainMongooseRepo } from '@app/repositories/mongoose'
import { DbLogger } from '@app/handlers/loggers/db.logger'
import { IJob } from '@app/dtos/job.dto'

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - departmentId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único del trabajo
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           description: Nombre del trabajo
 *           example: "Gerente de Producción"
 *         departmentId:
 *           type: string
 *           description: ID del departamento asociado
 *           example: "6789"
 *         active:
 *           type: boolean
 *           description: Indica si el trabajo está activo o inactivo
 *           example: true
 */
export const JobSchema = new Schema<IJob>({
  /* required fields */
  id: { type: String, required: true, trim: true, unique: true },

  name: { type: String, required: true, trim: true },
  departmentId: { type: String },

  /* defaults */
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: () => Date.now() },
  createdAt: { type: Date, default: () => Date.now(), immutable: true }
})

/**
 * Middleware `pre('save')`
 * Se ejecuta antes de guardar el documento en la base de datos.
 * - Actualiza `updatedAt` automáticamente antes de guardar.
 */
JobSchema.pre('save', async function (next) {
  this.updatedAt = new Date(Date.now())
  next()
})

/**
 * Middleware `post('save')`
 * Se ejecuta después de guardar el documento.
 * - Registra un log con los detalles del trabajo creado o actualizado.
 */
JobSchema.post('save', function (doc) {
  DbLogger.info(`[Job][${String(doc._id)}] Updated/Created: ${JSON.stringify(doc.toJSON())}`)
})

/* model instance */
export const JobModel = AppMainMongooseRepo.model<IJob>('job', JobSchema)
