const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { getDashboard, getActivities, createActivity, getAuditLogs } = require('../controllers/dashboard.controller');

const router = Router();
router.use(authenticate);

router.get('/dashboard',             requirePermission('deals:read'),     getDashboard);
router.get('/dashboard/summary',     requirePermission('deals:read'),     getDashboard);
router.get('/activities',            requirePermission('companies:read'),  getActivities);
router.get('/activities/:companyId', requirePermission('companies:read'),  getActivities);
router.post('/activities',           requirePermission('companies:write'), createActivity);
router.get('/audit-logs',            requirePermission('audit:read'),     getAuditLogs);

module.exports = router;
