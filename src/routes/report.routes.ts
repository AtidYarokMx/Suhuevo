import { authenticateUser } from '@app/middlewares/auth.middleware';
import { getWeeklyProductionReport, getHistoricalProductionReport } from '@controllers/report.controller';
import { Router } from 'express';

const router = Router();

router.get('/weekly-production', authenticateUser, getWeeklyProductionReport);
router.get('/historical-production', authenticateUser, getHistoricalProductionReport);

export default router;