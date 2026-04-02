const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth');
const { getContacts, getContactById, createContact, updateContact, deleteContact } = require('../controllers/contact.controller');

const router = Router();
router.use(authenticate);

router.get('/',        requirePermission('contacts:read'),   getContacts);
router.get('/:id',    requirePermission('contacts:read'),   getContactById);
router.post('/',      requirePermission('contacts:write'),  createContact);
router.put('/:id',    requirePermission('contacts:write'),  updateContact);
router.delete('/:id', requirePermission('contacts:delete'), deleteContact);

module.exports = router;
