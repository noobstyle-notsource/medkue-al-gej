import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getRoles,
  createRole,
  updateRole,
  getTenantUsers,
  assignUserRole,
} from '../controllers/rbac.controller';

const router = Router();
router.use(authenticate);

// Admin-only management endpoints (requires wildcard permission)
router.get('/roles', requirePermission('*'), getRoles);
router.post('/roles', requirePermission('*'), createRole);
router.put('/roles/:id', requirePermission('*'), updateRole);

router.get('/users', requirePermission('*'), getTenantUsers);
router.patch('/users/:id/role', requirePermission('*'), assignUserRole);

export default router;

