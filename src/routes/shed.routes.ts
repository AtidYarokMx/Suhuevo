import { Router } from 'express';
import { shedController } from '@controllers/shed.controller';
import { authenticateUser } from '@app/middlewares/auth.middleware';

/**
 * @swagger
 * tags:
 *   name: Sheds
 *   description: Gestión de casetas
 */
const shedRoutes = Router();

/**
 * @swagger
 * /api/sheds:
 *   post:
 *     summary: Crea una nueva caseta
 *     description: Permite registrar una nueva caseta dentro de una granja con un número único de caseta.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Caseta 1"
 *                 description: Nombre de la caseta
 *               farm:
 *                 type: string
 *                 example: "65fbc1234abc5678def91234"
 *                 description: ID de la granja a la que pertenece la caseta
 *               shedNumber:
 *                 type: integer
 *                 example: 1
 *                 description: Número único de la caseta en la granja (opcional, si no se envía, se asignará automáticamente)
 *             required:
 *               - name
 *               - farm
 *     responses:
 *       201:
 *         description: Caseta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Caseta creada exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "65fbf3214abc9876def91234"
 *                     name:
 *                       type: string
 *                       example: "Caseta 1"
 *                     farm:
 *                       type: string
 *                       example: "65fbc1234abc5678def91234"
 *                     shedNumber:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: "INACTIVE"
 *       400:
 *         description: Datos inválidos proporcionados
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.post('/', authenticateUser, shedController.create);

/**
 * @swagger
 * /api/sheds/{id}/status:
 *   put:
 *     summary: Cambia el estado de una caseta
 *     description: Permite actualizar el estado de una caseta asegurando la secuencia correcta de transición de estados.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la caseta cuyo estado se desea actualizar
 *         schema:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [inactive, cleaning, readyToProduction, production]
 *                 example: "cleaning"
 *                 description: Nuevo estado de la caseta
 *     responses:
 *       200:
 *         description: Estado de la caseta actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Estado de la caseta cambiado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "65fbf3214abc9876def91234"
 *                     name:
 *                       type: string
 *                       example: "Caseta Norte"
 *                     status:
 *                       type: string
 *                       example: "cleaning"
 *       400:
 *         description: Cambio de estado inválido o no permitido
 *       404:
 *         description: Caseta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.put('/:id/status', authenticateUser, shedController.changeShedStatus);


/**
 * @swagger
 * /api/sheds/{id}/initialize:
 *   put:
 *     summary: Inicializa una caseta con los datos de la parvada
 *     description: Permite establecer los datos iniciales de la caseta, como la cantidad de gallinas, edad, y peso promedio.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la caseta a inicializar
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               initialHensCount:
 *                 type: integer
 *                 example: 5000
 *                 description: Cantidad inicial de gallinas en la caseta
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-01"
 *                 description: Fecha de nacimiento de la parvada
 *               avgHensWeight:
 *                 type: number
 *                 example: 1.5
 *                 description: Peso promedio de las gallinas en kg
 *     responses:
 *       200:
 *         description: Caseta inicializada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Caseta inicializada exitosamente"
 *                 data:
 *                   type: object
 *                   description: Datos de la caseta actualizados
 *       400:
 *         description: Datos inválidos proporcionados
 *       404:
 *         description: Caseta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.put('/:id/initialize', authenticateUser, shedController.initializeShed);

/**
 * @swagger
 * /api/sheds/{id}/daily:
 *   post:
 *     summary: Captura datos diarios de producción de la caseta
 *     description: Permite registrar la producción diaria de la caseta, incluyendo alimento consumido, mortalidad y peso promedio de las gallinas.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la caseta para registrar los datos diarios
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               captureDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-05"
 *                 description: Fecha de captura de los datos
 *               foodConsumedKg:
 *                 type: number
 *                 example: 250.5
 *                 description: Kilogramos de alimento consumidos
 *               mortality:
 *                 type: integer
 *                 example: 10
 *                 description: Número de gallinas muertas
 *               avgHensWeight:
 *                 type: number
 *                 example: 1.6
 *                 description: Peso promedio de las gallinas en kg
 *               uniformity:
 *                 type: number
 *                 example: 90.5
 *                 description: Porcentaje de uniformidad de la parvada
 *     responses:
 *       200:
 *         description: Datos diarios capturados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Datos diarios registrados exitosamente"
 *                 data:
 *                   type: object
 *                   description: Datos registrados de la caseta
 *       400:
 *         description: Datos inválidos proporcionados
 *       404:
 *         description: Caseta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.post('/:id/daily', authenticateUser, shedController.captureDailyData);
/**

/**
 * @swagger
 * /api/sheds/{id}/summary:
 *   get:
 *     summary: Obtiene el resumen de la semana actual
 *     description: Recupera la información de producción de la caseta para la semana en curso (miércoles a martes).
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la caseta para obtener el resumen semanal
 *         schema:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *     responses:
 *       200:
 *         description: Resumen semanal obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shedId:
 *                   type: string
 *                   example: "65fbf3214abc9876def91234"
 *                   description: ID de la caseta
 *                 weekStart:
 *                   type: string
 *                   format: date
 *                   example: "2024-02-21"
 *                   description: Fecha de inicio de la semana actual
 *                 weekEnd:
 *                   type: string
 *                   format: date
 *                   example: "2024-02-27"
 *                   description: Fecha de fin de la semana actual
 *                 totalFoodConsumedKg:
 *                   type: number
 *                   example: 200.5
 *                   description: Total de alimento consumido en kg durante la semana
 *                 totalProducedEggs:
 *                   type: integer
 *                   example: 50000
 *                   description: Total de huevos producidos en la semana
 *                 totalProducedBoxes:
 *                   type: integer
 *                   example: 500
 *                   description: Total de cajas de huevos producidas en la semana
 *                 totalMortality:
 *                   type: integer
 *                   example: 20
 *                   description: Número total de gallinas muertas en la semana
 *                 boxesByType:
 *                   type: array
 *                   description: Cantidad de cajas producidas por tipo
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: "Jumbo"
 *                         description: Tipo de caja de huevos
 *                       count:
 *                         type: integer
 *                         example: 120
 *                         description: Número de cajas producidas de este tipo
 *       404:
 *         description: Caseta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.get('/:id/summary', authenticateUser, shedController.getWeeklySummary);

/**
 * @swagger
 * /api/sheds/{id}/total-summary:
 *   get:
 *     summary: Obtiene el resumen total de la generación actual
 *     description: Recupera la información acumulada de producción desde el inicio de la generación actual de la caseta hasta la fecha actual.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la caseta para obtener el resumen total de la generación actual.
 *         schema:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *     responses:
 *       200:
 *         description: Resumen total obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shedId:
 *                   type: string
 *                   example: "65fbf3214abc9876def91234"
 *                   description: ID de la caseta
 *                 generationId:
 *                   type: string
 *                   example: "20240221"
 *                   description: ID único de la generación actual
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   example: "2024-02-21"
 *                   description: Fecha de inicio de la generación actual
 *                 totalFoodConsumedKg:
 *                   type: number
 *                   example: 2500.75
 *                   description: Total acumulado de alimento consumido en kg
 *                 totalProducedEggs:
 *                   type: integer
 *                   example: 350000
 *                   description: Total acumulado de huevos producidos
 *                 totalProducedBoxes:
 *                   type: integer
 *                   example: 3500
 *                   description: Total acumulado de cajas de huevos producidas
 *                 totalMortality:
 *                   type: integer
 *                   example: 500
 *                   description: Número total de gallinas muertas desde el inicio de la generación
 *                 boxesByType:
 *                   type: array
 *                   description: Cantidad de cajas producidas por tipo
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: "Jumbo"
 *                         description: Tipo de caja de huevos
 *                       count:
 *                         type: integer
 *                         example: 1200
 *                         description: Número de cajas producidas de este tipo
 *       404:
 *         description: Caseta no encontrada o sin generación activa
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.get('/:id/total-summary', authenticateUser, shedController.getTotalSummary);

/**
 * @swagger
 * /api/sheds/{id}/generations-history:
 *   get:
 *     summary: Obtiene el historial de generaciones
 *     description: Recupera un listado de todas las generaciones registradas en una caseta, incluyendo sus métricas de producción.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la caseta para obtener su historial de generaciones.
 *         schema:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *     responses:
 *       200:
 *         description: Historial de generaciones obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   generationId:
 *                     type: string
 *                     example: "20240221"
 *                     description: ID único de la generación
 *                   startDate:
 *                     type: string
 *                     format: date
 *                     example: "2024-02-21"
 *                     description: Fecha de inicio de la generación
 *                   endDate:
 *                     type: string
 *                     format: date
 *                     example: "2024-06-15"
 *                     description: Fecha de finalización de la generación
 *                   totalFoodConsumedKg:
 *                     type: number
 *                     example: 9800.50
 *                     description: Total de alimento consumido en kg durante la generación
 *                   totalProducedEggs:
 *                     type: integer
 *                     example: 1250000
 *                     description: Total de huevos producidos en la generación
 *                   totalProducedBoxes:
 *                     type: integer
 *                     example: 12500
 *                     description: Total de cajas producidas en la generación
 *                   totalMortality:
 *                     type: integer
 *                     example: 1500
 *                     description: Número total de gallinas muertas en la generación
 *                   boxesByType:
 *                     type: array
 *                     description: Cantidad de cajas producidas por tipo
 *                     items:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: "Extra Grande"
 *                           description: Tipo de caja de huevos
 *                         count:
 *                           type: integer
 *                           example: 4500
 *                           description: Número de cajas producidas de este tipo
 *       404:
 *         description: Caseta no encontrada o sin historial de generaciones
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.get('/:id/generations-history', authenticateUser, shedController.getGenerationsHistory);

/**
 * @swagger
 * /api/sheds/{id}/production-trends:
 *   get:
 *     summary: Obtiene tendencias de producción
 *     description: Recupera las tendencias de producción de una caseta en diferentes periodos, mostrando la cantidad de cajas producidas por tipo a lo largo del tiempo.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la caseta para obtener sus tendencias de producción.
 *         schema:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *     responses:
 *       200:
 *         description: Tendencias de producción obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   weekStart:
 *                     type: string
 *                     format: date
 *                     example: "2024-02-21"
 *                     description: Fecha de inicio de la semana analizada
 *                   weekEnd:
 *                     type: string
 *                     format: date
 *                     example: "2024-02-27"
 *                     description: Fecha de finalización de la semana analizada
 *                   boxesByType:
 *                     type: array
 *                     description: Cantidad de cajas producidas por tipo en la semana
 *                     items:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: "Jumbo"
 *                           description: Tipo de caja de huevos
 *                         count:
 *                           type: integer
 *                           example: 1200
 *                           description: Número de cajas producidas de este tipo
 *       404:
 *         description: Caseta no encontrada o sin registros de producción
 *       500:
 *         description: Error interno del servidor
 */

// Quitar este endpoint
shedRoutes.get('/:id/production-trends', authenticateUser, shedController.getProductionTrends);

/**
 * @swagger
 * /api/sheds/{id}:
 *   get:
 *     summary: Obtiene una caseta por su identificador
 *     description: Recupera los detalles de una caseta específica con su información actual, incluyendo su estado y producción.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la caseta a consultar
 *         schema:
 *           type: string
 *           example: "65fbf3214abc9876def91234"
 *     responses:
 *       200:
 *         description: Caseta encontrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "65fbf3214abc9876def91234"
 *                   description: Identificador único de la caseta
 *                 name:
 *                   type: string
 *                   example: "Caseta Norte"
 *                   description: Nombre de la caseta
 *                 status:
 *                   type: string
 *                   enum: [inactive, cleaning, readyToProduction, production]
 *                   example: "production"
 *                   description: Estado actual de la caseta
 *                 farm:
 *                   type: string
 *                   example: "65fbf3214abc9876def91235"
 *                   description: ID de la granja a la que pertenece la caseta
 *                 initialHensCount:
 *                   type: integer
 *                   example: 20000
 *                   description: Número inicial de gallinas en la caseta
 *                 generationId:
 *                   type: string
 *                   example: "20240221"
 *                   description: Identificador único de la generación actual de la caseta
 *                 summary:
 *                   type: object
 *                   description: Resumen actual de la producción de la caseta
 *                   properties:
 *                     totalFoodConsumedKg:
 *                       type: number
 *                       example: 1500.5
 *                       description: Total de alimento consumido en kilogramos
 *                     totalProducedEggs:
 *                       type: integer
 *                       example: 100000
 *                       description: Total de huevos producidos
 *                     totalProducedBoxes:
 *                       type: integer
 *                       example: 5000
 *                       description: Total de cajas de huevos producidas
 *                     totalMortality:
 *                       type: integer
 *                       example: 150
 *                       description: Número de gallinas fallecidas
 *       404:
 *         description: Caseta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.get('/:id', authenticateUser, shedController.getOne);

/**
 * @swagger
 * /api/sheds:
 *   get:
 *     summary: Obtiene todas las casetas activas
 *     description: Recupera una lista de todas las casetas activas con su información principal y resumen de producción.
 *     tags: [Sheds]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de casetas activas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "65fbf3214abc9876def91234"
 *                     description: Identificador único de la caseta
 *                   name:
 *                     type: string
 *                     example: "Caseta Norte"
 *                     description: Nombre de la caseta
 *                   status:
 *                     type: string
 *                     enum: [inactive, cleaning, readyToProduction, production]
 *                     example: "production"
 *                     description: Estado actual de la caseta
 *                   farm:
 *                     type: string
 *                     example: "65fbf3214abc9876def91235"
 *                     description: ID de la granja a la que pertenece la caseta
 *                   initialHensCount:
 *                     type: integer
 *                     example: 20000
 *                     description: Número inicial de gallinas en la caseta
 *                   generationId:
 *                     type: string
 *                     example: "20240221"
 *                     description: Identificador único de la generación actual de la caseta
 *                   summary:
 *                     type: object
 *                     description: Resumen actual de la producción de la caseta
 *                     properties:
 *                       totalFoodConsumedKg:
 *                         type: number
 *                         example: 1500.5
 *                         description: Total de alimento consumido en kilogramos
 *                       totalProducedEggs:
 *                         type: integer
 *                         example: 100000
 *                         description: Total de huevos producidos
 *                       totalProducedBoxes:
 *                         type: integer
 *                         example: 5000
 *                         description: Total de cajas de huevos producidas
 *                       totalMortality:
 *                         type: integer
 *                         example: 150
 *                         description: Número de gallinas fallecidas
 *       500:
 *         description: Error interno del servidor
 */
shedRoutes.get('/', authenticateUser, shedController.getAll);


export default shedRoutes;
