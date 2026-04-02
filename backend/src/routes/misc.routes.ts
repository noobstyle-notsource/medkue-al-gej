import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { getDashboard, getActivities, createActivity, getAuditLogs } from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticate);

router.get('/dashboard',      requirePermission('deals:read'),    getDashboard);
router.get('/dashboard/summary', requirePermission('deals:read'), getDashboard);
router.get('/activities/:contactId', requirePermission('contacts:read'), getActivities);
router.post('/activities',    requirePermission('contacts:write'), createActivity);
router.get('/audit-logs',     requirePermission('*'),           getAuditLogs); // Only admins (with '*') can access audit logs

export default router;
