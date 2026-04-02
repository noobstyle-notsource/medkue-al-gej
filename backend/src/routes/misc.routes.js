const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { 
  getDashboard, 
  getActivities, 
  createActivity, 
  getReminders, 
  createReminder, 
  deleteReminder, 
  getAuditLogs 
} = require('../controllers/dashboard.controller');

const router = Router();
router.use(authenticate);

router.get('/dashboard',             requirePermission('deals:read'),     getDashboard);
router.get('/dashboard/summary',     requirePermission('deals:read'),     getDashboard);
router.get('/activities',            requirePermission('companies:read'),  getActivities);
router.get('/activities/:companyId', requirePermission('companies:read'),  getActivities);
router.post('/activities',           requirePermission('companies:write'), createActivity);
router.get('/audit-logs',            authenticate, (req, res, next) => {
  if (req.user.email !== 'misheelmother@gmail.com') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}, getAuditLogs);

// Reminders
router.get('/reminders',             authenticate, getReminders);
router.post('/reminders',            authenticate, createReminder);
router.delete('/reminders/:id',      authenticate, deleteReminder);

module.exports = router;
