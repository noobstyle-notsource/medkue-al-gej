const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} = require('../controllers/company.controller');

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('companies:read'), getCompanies);
router.get('/:id', requirePermission('companies:read'), getCompanyById);
router.post('/', requirePermission('companies:write'), createCompany);
router.put('/:id', requirePermission('companies:write'), updateCompany);
router.delete('/:id', requirePermission('companies:delete'), deleteCompany);

module.exports = router;

