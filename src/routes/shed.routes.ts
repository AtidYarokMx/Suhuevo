import { Router } from 'express';
import { shedController } from '@controllers/shed.controller';
import { authenticateUser } from '@app/middlewares/auth.middleware';

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
shedRoutes.post('/', authenticateUser, shedController.create);

/**
 * 🚀 Inicializa una caseta
 * @route PUT /api/shed/:id/initialize
 * @access Admin
 */
shedRoutes.put('/:id/initialize', authenticateUser, shedController.initializeShed);

/**
 * 🔄 Cambia el estado de una caseta
 * @route PUT /api/shed/:id/status
 * @access Admin
 */
shedRoutes.put('/:id/status', authenticateUser, shedController.changeShedStatus);

/**
 * 🛠️ Actualiza datos de una caseta
 * @route PUT /api/shed/:id
 * @access Admin
 */
shedRoutes.put("/:id", authenticateUser, shedController.updateShed);

/**
 * 📜 Obtiene el historial de una caseta con filtro de fechas opcional
 * @route GET /api/shed/:id/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * @access Admin
 */
shedRoutes.get('/:id/history', authenticateUser, shedController.getShedHistory);

/**
 * 🔍 Obtiene una caseta por su identificador
 * @route GET /api/shed/:id
 * @access Admin
 */
shedRoutes.get('/:id', authenticateUser, shedController.getOne);

/**
 * 📢 Obtiene todas las casetas activas
 * @route GET /api/shed
 * @access Admin
 */
shedRoutes.get('/', authenticateUser, shedController.getAll);

export default shedRoutes;
