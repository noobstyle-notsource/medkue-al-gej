import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/company.controller';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('companies:read'), getCompanies);
router.get('/:id', requirePermission('companies:read'), getCompanyById);
router.post('/', requirePermission('companies:write'), createCompany);
router.put('/:id', requirePermission('companies:write'), updateCompany);
router.delete('/:id', requirePermission('companies:delete'), deleteCompany);

export default router;

