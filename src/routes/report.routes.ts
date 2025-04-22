import { authenticateUser } from '@app/middlewares/auth.middleware';
import { reportController } from '@controllers/report.controller';
import { RequestHandler, Router } from 'express';
import { ServerRouter } from './models/route'

class ReportRoutes extends ServerRouter {
  controller = reportController;

  constructor() {
    super();
    this.config();
  }

  config(): void {

    this.router.post('/sales/daily', authenticateUser, this.controller.generateDailySales as RequestHandler);
    this.router.get('/weekly/:shedId', authenticateUser, this.controller.getWeeklyProductionReport as RequestHandler);

    /**
     * 📢 Obtiene el reporte histórico de producción
     * @route GET /api/report/historical/:shedId
     * @access Admin
     */
    this.router.get('/historical/:shedId', authenticateUser, this.controller.getHistoricalProductionReport as RequestHandler);
  }
}

const reportRoutes: ReportRoutes = new ReportRoutes();
export default reportRoutes.router;