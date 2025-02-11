import { Router } from 'express';
import { shedController } from '@controllers/shed.controller';
import { adminMiddleware } from '@app/middlewares/auth.middleware';

/**
 * 📌 Rutas para la gestión de casetas (Sheds)
 * Todas las rutas requieren autenticación de administrador.
 */
const shedRoutes = Router();

/**
 * 🏗️ Crea una nueva caseta
 * @route POST /api/shed
 * @access Admin
 */
shedRoutes.post('/', adminMiddleware, shedController.create);

/**
 * 🚀 Inicializa una caseta
 * @route PUT /api/shed/:id/initialize
 * @access Admin
 */
shedRoutes.put('/:id/initialize', adminMiddleware, shedController.initializeShed);

/**
 * 🔄 Cambia el estado de una caseta
 * @route PUT /api/shed/:id/status
 * @access Admin
 */
shedRoutes.put('/:id/status', adminMiddleware, shedController.changeShedStatus);

/**
 * 🛠️ Actualiza datos de una caseta
 * @route PUT /api/shed/:id
 * @access Admin
 */
shedRoutes.put("/:id", adminMiddleware, shedController.updateShed);

/**
 * 📜 Obtiene el historial de una caseta con filtro de fechas opcional
 * @route GET /api/shed/:id/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @access Admin
 */
shedRoutes.get('/:id/history', adminMiddleware, shedController.getShedHistory);

/**
 * 🔍 Obtiene una caseta por su identificador
 * @route GET /api/shed/:id
 * @access Admin
 */
shedRoutes.get('/:id', adminMiddleware, shedController.getOne);

/**
 * 📢 Obtiene todas las casetas activas
 * @route GET /api/shed
 * @access Admin
 */
shedRoutes.get('/', adminMiddleware, shedController.getAll);

export default shedRoutes;
