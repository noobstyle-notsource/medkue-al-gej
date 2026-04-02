const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { getDeals, createDeal, updateDeal, moveDealStage } = require('../controllers/deal.controller');

const router = Router();
router.use(authenticate);

router.get('/',            requirePermission('deals:read'),   getDeals);
router.post('/',           requirePermission('deals:write'),  createDeal);
router.put('/:id',         requirePermission('deals:write'),  updateDeal);
router.patch('/:id/stage', requirePermission('deals:write'),  moveDealStage);

module.exports = router;
