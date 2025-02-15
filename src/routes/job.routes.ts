import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { adminMiddleware } from '@app/middlewares/auth.middleware'
import { jobController } from '@controllers/job.controller'

/**
 * **Rutas para la gestión de trabajos**
 * @class JobRoutes
 */
class JobRoutes extends ServerRouter {
  controller = jobController

  constructor() {
    super()
    this.config()
  }

  /**
   * **Configuración de rutas para la entidad Job**
   * - Aplica middleware de autenticación (`adminMiddleware`).
   */

  config(): void {
    /**
     * **Obtener lista de trabajos**
     * @route GET /api/job
     * @description Obtiene la lista de trabajos disponibles en el sistema.
     * @middleware adminMiddleware - Requiere autenticación de administrador.
     */
    this.router.get('/', [adminMiddleware], this.controller.getJobs as RequestHandler)

    /**
     * **Crear un nuevo trabajo**
     * @route POST /api/job/create
     * @description Crea un nuevo trabajo en la base de datos.
     * @middleware adminMiddleware - Requiere autenticación de administrador.
     */
    this.router.post('/create', [adminMiddleware], this.controller.create as RequestHandler)

    /**
     * **Actualizar un trabajo existente**
     * @route PATCH /api/job/update
     * @description Actualiza los datos de un trabajo identificado por su ID.
     * @middleware adminMiddleware - Requiere autenticación de administrador.
     */
    this.router.patch('/update', [adminMiddleware], this.controller.update as RequestHandler)

    /**
     * **Buscar trabajos con filtros**
     * @route GET /api/job/search
     * @description Filtra los trabajos según los parámetros de búsqueda.
     * @middleware adminMiddleware - Requiere autenticación de administrador.
     */
    this.router.get('/search', [adminMiddleware], this.controller.search as RequestHandler)
  }
}

/* Exportación de rutas */
const jobRoutes: JobRoutes = new JobRoutes()
export default jobRoutes.router
