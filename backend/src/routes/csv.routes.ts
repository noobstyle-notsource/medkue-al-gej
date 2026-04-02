import { Router } from 'express';
import multer from 'multer';
import { authenticate, requirePermission } from '../middleware/auth';
import { importContacts, exportContacts } from '../controllers/csv.controller';

const upload = multer({ dest: 'uploads/' });
const router = Router();
router.use(authenticate);

router.post('/import', requirePermission('contacts:write'), upload.single('file'), importContacts);
router.get('/export',  requirePermission('contacts:read'),  exportContacts);

export default router;
