const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const {
  getRoles,
  createRole,
  updateRole,
  getTenantUsers,
  assignUserRole,
} = require('../controllers/rbac.controller');

const router = Router();
router.use(authenticate);

// Admin-only management endpoints (requires wildcard permission)
router.get('/roles', requirePermission('*'), getRoles);
router.post('/roles', requirePermission('*'), createRole);
router.put('/roles/:id', requirePermission('*'), updateRole);

router.get('/users', requirePermission('*'), getTenantUsers);
router.patch('/users/:id/role', requirePermission('*'), assignUserRole);

module.exports = router;

