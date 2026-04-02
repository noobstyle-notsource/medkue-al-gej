const { Router } = require('express');
const multer = require('multer');
const { authenticate, requirePermission } = require('../middleware/auth');
const { importCompanies, exportCompanies } = require('../controllers/csv.controller');

const upload = multer({ dest: 'uploads/' });
const router = Router();
router.use(authenticate);

router.post('/import', requirePermission('companies:write'), upload.single('file'), importCompanies);
router.get('/export',  requirePermission('companies:read'),  exportCompanies);

module.exports = router;
