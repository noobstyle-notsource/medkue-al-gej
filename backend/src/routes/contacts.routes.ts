import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getContacts, getContactById, createContact, updateContact, deleteContact,
} from '../controllers/contact.controller';

const router = Router();
router.use(authenticate);

router.get('/',       requirePermission('contacts:read'),   getContacts);
router.get('/:id',   requirePermission('contacts:read'),   getContactById);
router.post('/',     requirePermission('contacts:write'),  createContact);
router.put('/:id',   requirePermission('contacts:write'),  updateContact);
router.delete('/:id', requirePermission('contacts:delete'), deleteContact);

export default router;
