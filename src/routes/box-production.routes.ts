import type { RequestHandler } from 'express'
/* route model */
import { ServerRouter } from './models/route'
/* middlewares */
import { adminMiddleware } from '@app/middlewares/auth.middleware'
/* controllers */
import { boxProductionController } from '@controllers/box-production.controller'
import { customLog } from '@app/utils/util.util'

/**
 * 📦 Rutas para la gestión de cajas de producción.
 * Se encarga de manejar las solicitudes relacionadas con la producción de cajas,
 * incluyendo la obtención, resumen, sincronización y envío a ventas.
 */
class BoxProductionRoutes extends ServerRouter {
  controller = boxProductionController

  constructor() {
    super()
    this.config()
  }

  /**
 * Configura las rutas de la API para la gestión de cajas de producción.
 * Todas las rutas están protegidas con `adminMiddleware`.
 */
  private config(): void {
    customLog("🔧 Configurando rutas de BoxProduction...");

    /** 
     * 📢 Obtiene todas las cajas activas.
     * @route GET /api/boxes
     * @queryParam {boolean} summary - Si es `true`, devuelve un resumen de los tipos de huevo.
     * @returns Lista de cajas activas o su resumen.
     */
    this.router.get('/', adminMiddleware, this.wrapWithLogging(this.controller.getAll))

    /** 
     * 📊 Obtiene un resumen de tipos de huevo basado en las cajas registradas.
     * @route GET /api/boxes/egg-type-summary
     * @queryParam {string} startDate - Fecha de inicio (YYYY-MM-DD).
     * @queryParam {string} endDate - Fecha de fin (YYYY-MM-DD).
     * @queryParam {number} farmNumber - Número de la granja.
     * @queryParam {number} shedNumber - Número del galpón.
     * @queryParam {number} status - Estado de las cajas.
     * @returns Un resumen de los tipos de huevo y su cantidad.
     */
    this.router.get('/egg-type-summary', adminMiddleware, this.wrapWithLogging(this.controller.getEggTypeSummaryFromBoxes));

    /** 
     * 🔍 Obtiene una caja de producción por su código.
     * @route GET /api/boxes/:code
     * @pathParam {string} code - Código único de la caja de producción.
     * @returns Información de la caja encontrada o un error si no existe.
     */
    this.router.get('/:code', adminMiddleware, this.wrapWithLogging(this.controller.getOne))

    /** 
     * 🚛 Envía cajas de producción a ventas.
     * @route POST /api/boxes/sells
     * @bodyParam {object} body - Contiene los códigos de las cajas y la información del transporte.
     * @returns Resultado de la actualización del estado de las cajas.
     */
    this.router.post('/sells', adminMiddleware, this.wrapWithLogging(this.controller.sendBoxesToSells))

    /** 
     * 🔄 Sincroniza los códigos de producción desde la base SQL a MongoDB.
     * @route POST /api/boxes/sync
     * @returns Resultado de la sincronización de datos.
     */
    this.router.post('/sync', adminMiddleware, this.wrapWithLogging(this.controller.synchronize))
  }

  /**
   * Envuelve un controlador para agregar logs de inicio y fin de cada solicitud.
   * @param handler - Controlador de Express.
   * @returns Un RequestHandler con logs adicionales.
   */
  private wrapWithLogging(handler: RequestHandler): RequestHandler {
    return async (req, res, next) => {
      customLog(`➡️  ${req.method} ${req.originalUrl} - Iniciando...`);
      try {
        handler(req, res, next);
        customLog(`✅ ${req.method} ${req.originalUrl} - Finalizado con éxito.`);
      } catch (error) {
        customLog(`❌ ${req.method} ${req.originalUrl} - Error: ${String(error)}`);
        next(error);
      }
    };
  }
}

const boxProductionRoutes: BoxProductionRoutes = new BoxProductionRoutes()
export default boxProductionRoutes.router

