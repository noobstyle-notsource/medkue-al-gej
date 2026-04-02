import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { getDeals, createDeal, updateDeal, moveDealStage, createReminder, getReminders } from '../controllers/deal.controller';

const router = Router();
router.use(authenticate);

router.get('/',           requirePermission('deals:read'),   getDeals);
router.post('/',          requirePermission('deals:write'),  createDeal);
router.put('/:id',        requirePermission('deals:write'),  updateDeal);
router.patch('/:id/stage', requirePermission('deals:write'), moveDealStage);

router.get('/reminders',  requirePermission('deals:read'),   getReminders);
router.post('/reminders', requirePermission('deals:write'),  createReminder);

export default router;
