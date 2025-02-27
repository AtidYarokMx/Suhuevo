import type { RequestHandler } from 'express'
import { ServerRouter } from './models/route'
import { authenticateUser } from '@app/middlewares/auth.middleware'
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
   * - Aplica middleware de autenticación (`authenticateUser`).
   */

  config(): void {
    /**
     * **Obtener lista de trabajos**
     * @route GET /api/job
     * @description Obtiene la lista de trabajos disponibles en el sistema.
     * @middleware authenticateUser - Requiere autenticación de administrador.
     */
    this.router.get('/', [authenticateUser], this.controller.getJobs as RequestHandler)

    /**
     * **Crear un nuevo trabajo**
     * @route POST /api/job/create
     * @description Crea un nuevo trabajo en la base de datos.
     * @middleware authenticateUser - Requiere autenticación de administrador.
     */
    this.router.post('/create', [authenticateUser], this.controller.create as RequestHandler)

    /**
     * **Actualizar un trabajo existente**
     * @route PATCH /api/job/update
     * @description Actualiza los datos de un trabajo identificado por su ID.
     * @middleware authenticateUser - Requiere autenticación de administrador.
     */
    this.router.patch('/update', [authenticateUser], this.controller.update as RequestHandler)

    /**
     * **Buscar trabajos con filtros**
     * @route GET /api/job/search
     * @description Filtra los trabajos según los parámetros de búsqueda.
     * @middleware authenticateUser - Requiere autenticación de administrador.
     */
    this.router.get('/search', [authenticateUser], this.controller.search as RequestHandler)
  }
}

/* Exportación de rutas */
const jobRoutes: JobRoutes = new JobRoutes()
export default jobRoutes.router
