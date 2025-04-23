import type { RequestHandler } from 'express';
import { ServerRouter } from './models/route';
import { authenticateUser } from '@app/middlewares/auth.middleware';
import { saleController } from '@controllers/sale.controller';

class SaleRoutes extends ServerRouter {
  controller = saleController;

  constructor() {
    super();
    this.config();
  }

  config(): void {
    this.router.post('/', authenticateUser, this.controller.create as RequestHandler);

    // Crear venta desde el inventario de ventas
    this.router.post(
      '/from-inventory',
      authenticateUser,
      this.controller.createFromInventory as RequestHandler
    );

    // Obtener todas las ventas
    this.router.get(
      '/all',
      authenticateUser,
      this.controller.getAllSales as RequestHandler
    );

    // Crear venta desde un listado de envío
    this.router.post(
      '/from-shipment',
      authenticateUser,
      this.controller.createFromShipment as RequestHandler
    );

    // Obtener detalles de una venta
    this.router.get(
      '/:saleId',
      authenticateUser,
      this.controller.getSaleDetails as RequestHandler
    );

    // Registrar un pago
    this.router.post(
      '/:saleId/payments',
      authenticateUser,
      this.controller.registerPayment as RequestHandler
    );

    // Ventas vencidas (cuentas por cobrar vencidas)
    this.router.get(
      '/overdue',
      authenticateUser,
      this.controller.getOverdueSales as RequestHandler
    );
  }
}

const saleRoutes: SaleRoutes = new SaleRoutes();
export default saleRoutes.router;