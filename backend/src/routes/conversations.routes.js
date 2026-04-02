const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getConversations,
  createOrFindConversation,
  getMessages,
  sendMessage,
} = require('../controllers/conversation.controller');

const router = Router();
router.use(authenticate);

router.get('/', getConversations);
router.post('/', createOrFindConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

module.exports = router;

