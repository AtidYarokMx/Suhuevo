import type { RequestHandler } from "express";
import { ServerRouter } from "./models/route";
import { authenticateUser } from "@app/middlewares/auth.middleware";
import { summaryController } from "@controllers/summary.controller";

/**
 * **Rutas para la gestión de trabajos**
 * @class SummaryRoutes
 */
class SummaryRoutes extends ServerRouter {
  controller = summaryController;

  constructor() {
    super();
    this.config();
  }

  /**
   * **Configuración de rutas para la entidad Job**
   * - Aplica middleware de autenticación (`authenticateUser`).
   */

  config(): void {
    /**
     * **Obtener lista de trabajos**
     * @route GET /api/bsc
     * @description Obtiene el summary BSC.
     * @middleware authenticateUser - Requiere autenticación de administrador.
     */
    this.router.get("/", [authenticateUser], this.controller.get as RequestHandler);
    /**
     * **Genera el reporte del bsc en formato excel**
     * @route POST /api/bsc/excel
     * @description Obtiene el summary BSC.
     * @middleware authenticateUser - Requiere autenticación de administrador.
     */
    this.router.post("/excel", [authenticateUser], this.controller.generateExcel as RequestHandler);
  }
}

/* Exportación de rutas */
const summaryRoutes: SummaryRoutes = new SummaryRoutes();
export default summaryRoutes.router;
