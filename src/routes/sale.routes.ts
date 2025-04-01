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

    // Obtener detalles de una venta
    this.router.get(
      '/:saleId',
      authenticateUser,
      this.controller.getSaleDetails as RequestHandler
    );

    // Registrar un pago parcial
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