const { prisma } = require('../lib/prisma');
const { audit } = require('../lib/audit');

function canonicalPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function assertParticipantOrThrow({ tenantId, userId, conversationId }) {
  const convo = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      tenantId,
      OR: [
        { userAId: userId },
        { userBId: userId },
      ],
    },
  });
  return convo;
}

// GET /api/conversations
const getConversations = async (req, res) => {
  const { id: userId, tenantId } = req.user;
  const conversations = await prisma.conversation.findMany({
    where: { tenantId, OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { updatedAt: 'desc' },
    include: {
      userB: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
    },
  });
  res.json(conversations);
};

// POST /api/conversations { otherUserId or companyId }
const createOrFindConversation = async (req, res) => {
  const { id: userId, tenantId } = req.user;
  const { otherUserId, companyId } = req.body || {};
  
  if ((!otherUserId && !companyId) || (otherUserId && companyId)) {
    return res.status(400).json({ error: 'Provide either otherUserId or companyId, not both' });
  }
  
  if (otherUserId) {
    if (typeof otherUserId !== 'string') {
      return res.status(400).json({ error: 'otherUserId must be a string' });
    }
    if (otherUserId === userId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    const other = await prisma.user.findFirst({ where: { id: otherUserId, tenantId }, select: { id: true } });
    if (!other) return res.status(404).json({ error: 'User not found in tenant' });

    const [userAId, userBId] = canonicalPair(userId, otherUserId);

    const convo = await prisma.conversation.upsert({
      where: { tenantId_userAId_userBId: { tenantId, userAId, userBId } },
      update: { updatedAt: new Date() },
      create: { tenantId, userAId, userBId },
    });

    res.status(201).json(convo);
  } else if (companyId) {
    if (typeof companyId !== 'string') {
      return res.status(400).json({ error: 'companyId must be a string' });
    }

    const company = await prisma.company.findFirst({ where: { id: companyId, tenantId }, select: { id: true } });
    if (!company) return res.status(404).json({ error: 'Company not found in tenant' });

    const convo = await prisma.conversation.upsert({
      where: { tenantId_userAId_companyId: { tenantId, userAId: userId, companyId } },
      update: { updatedAt: new Date() },
      create: { tenantId, userAId: userId, companyId },
    });

    res.status(201).json(convo);
  }
};

// GET /api/conversations/:id/messages?limit=50&offset=0
const getMessages = async (req, res) => {
  const { id: userId, tenantId } = req.user;
  const { limit = '50', offset = '0' } = req.query;
  const conversationId = req.params.id;

  const convo = await assertParticipantOrThrow({ tenantId, userId, conversationId });
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  const take = Math.min(200, Math.max(1, parseInt(String(limit)) || 50));
  const skip = Math.max(0, parseInt(String(offset)) || 0);

  const messages = await prisma.message.findMany({
    where: { tenantId, conversationId },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });

  res.json(messages.reverse());
};

// POST /api/conversations/:id/messages { body }
const sendMessage = async (req, res) => {
  const { id: userId, tenantId } = req.user;
  const conversationId = req.params.id;
  const { body } = req.body || {};
  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'body is required' });
  }

  const convo = await assertParticipantOrThrow({ tenantId, userId, conversationId });
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  const msg = await prisma.message.create({
    data: { tenantId, conversationId, senderId: userId, body: body.trim() },
  });

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  await audit({ tenantId, userId, action: 'CREATE', resource: 'message', resourceId: msg.id, after: msg });

  res.status(201).json(msg);
};

module.exports = { getConversations, createOrFindConversation, getMessages, sendMessage };

