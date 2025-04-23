import { Router, RequestHandler } from 'express';
import { ServerRouter } from './models/route';
import { authenticateUser } from '@app/middlewares/auth.middleware';
import { reportController } from '@controllers/report.controller';

class ReportRoutes extends ServerRouter {
  controller = reportController;

  constructor() {
    super();
    this.config();
  }

  config(): void {
    /**
     * 🔵 Reporte de ventas por día por clasificación
     * @route POST /api/report/sales/daily
     * @body { from, to, format }
     * @format excel | pdf
     */
    this.router.post(
      '/sales/daily',
      authenticateUser,
      this.controller.generateDailySales as RequestHandler
    );

    /**
     * 🟡 Reporte de producción semanal
     * @route GET /api/report/weekly/:shedId
     */
    this.router.get(
      '/weekly/:shedId',
      authenticateUser,
      this.controller.getWeeklyProductionReport as RequestHandler
    );

    /**
     * 🟢 Reporte histórico de producción
     * @route GET /api/report/historical/:shedId
     */
    this.router.get(
      '/historical/:shedId',
      authenticateUser,
      this.controller.getHistoricalProductionReport as RequestHandler
    );

    this.router.get(
      '/sales/ticket/:saleId',
      authenticateUser,
      this.controller.getSalesTicket as RequestHandler
    );

    /**
 * 📊 Reporte de abonos por cliente
 * @route POST /api/report/sales/payments
 * @body { from, to, format }
 */
    this.router.post(
      '/sales/payments',
      authenticateUser,
      this.controller.generatePaymentsReport as RequestHandler
    );

    /**
 * 🧮 Reporte de ventas por cliente por clasificación
 * @route POST /api/report/sales/by-client
 */
    this.router.post(
      '/sales/by-client',
      authenticateUser,
      this.controller.generateClientDailySalesReport as RequestHandler
    );

    /**
 * 📊 Reporte semanal por clasificación
 * @route POST /api/report/sales/weekly-by-classification
 */
    this.router.post(
      '/sales/weekly-by-classification',
      authenticateUser,
      this.controller.generateWeeklySalesByClassification as RequestHandler
    );

    /**
 * 💰 Resumen financiero de ventas
 * @route POST /api/report/sales/financial-summary
 */
    this.router.post(
      '/sales/financial-summary',
      authenticateUser,
      this.controller.generateFinancialSalesSummary as RequestHandler
    );

  }
}

const reportRoutes: ReportRoutes = new ReportRoutes();
export default reportRoutes.router;
