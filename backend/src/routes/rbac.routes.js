const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const {
  getRoles,
  createRole,
  updateRole,
  getTenantUsers,
  assignUserRole,
  createTenantUser,
} = require('../controllers/rbac.controller');

const router = Router();
router.use(authenticate);

// Admin/Manager management endpoints
router.get('/roles',    requirePermission('roles:read'),   getRoles);
router.post('/roles',   requirePermission('roles:manage'), createRole);
router.put('/roles/:id', requirePermission('roles:manage'), updateRole);

router.get('/users',    requirePermission('users:read'),   getTenantUsers);
router.post('/users',   requirePermission('users:manage'), createTenantUser);
router.patch('/users/:id/role', requirePermission('users:manage'), assignUserRole);

module.exports = router;

