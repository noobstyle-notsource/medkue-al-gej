import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { getDashboardMetrics } from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('deals:read'), getDashboardMetrics);

export default router;
