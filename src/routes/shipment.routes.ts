import type { RequestHandler } from 'express';
import { ServerRouter } from './models/route';
import { authenticateUser } from '@app/middlewares/auth.middleware';
import { shipmentController } from '@controllers/shipment.controller';

class ShipmentRoutes extends ServerRouter {
  controller = shipmentController;

  constructor() {
    super();
    this.config();
  }

  config(): void {
    this.router.post('/', authenticateUser, this.controller.create as RequestHandler);

    // Crear un nuevo envío
    this.router.post('/send', authenticateUser, this.controller.sendBoxesToSells as RequestHandler);

    // Obtener todos los envíos
    this.router.get('/all', authenticateUser, this.controller.getAllShipments as RequestHandler);

    // Obtener detalles de un envío específico
    this.router.get('/:shipmentId', authenticateUser, this.controller.getShipmentDetails as RequestHandler);

    // Actualizar el estado de un envío
    this.router.patch('/update/:shipmentId', authenticateUser, this.controller.updateShipment as RequestHandler);


  }
}

const shipmentRoutes: ShipmentRoutes = new ShipmentRoutes();
export default shipmentRoutes.router;
