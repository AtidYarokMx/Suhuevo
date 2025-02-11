import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { farmController } from '@controllers/farm.controller'

class FarmRoutes extends ServerRouter {
  controller = farmController

  constructor() {
    super()
    this.config()
  }
  /**
     * 🔧 Configuración de las rutas de granjas
     */
  config(): void {
    /**
     * 📢 Obtiene todas las granjas activas
     * @route GET /api/farm
     * @access Admin
     */
    this.router.get("/", adminMiddleware, this.controller.getAll as RequestHandler);

    /**
     * 📢 Obtiene todas las granjas con sus casetas asociadas
     * @route GET /api/farm/sheds
     * @access Admin
     */
    this.router.get("/sheds", adminMiddleware, this.controller.getAllWithSheds as RequestHandler);

    /**
     * 🔍 Obtiene una granja por su ID
     * @route GET /api/farm/:id
     * @access Admin
     */
    this.router.get("/:id", adminMiddleware, this.controller.getOne as RequestHandler);

    /**
     * 🔍 Obtiene una granja por su ID con sus casetas asociadas
     * @route GET /api/farms/:id/sheds
     * @access Admin
     */
    this.router.get("/:id/sheds", adminMiddleware, this.controller.getOneWithSheds as RequestHandler);

    /**
     * 🏗️ Crea una nueva granja
     * @route POST /api/farms
     * @access Admin
     */
    this.router.post("/", adminMiddleware, this.controller.create as RequestHandler);

    /**
     * 🛠️ Actualiza los datos de una granja
     * @route PUT /api/farms/:id
     * @access Admin
     */
    this.router.put("/:id", adminMiddleware, this.controller.update as RequestHandler);
  }
}

const farmRoutes: FarmRoutes = new FarmRoutes()
export default farmRoutes.router
