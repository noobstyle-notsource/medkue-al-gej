const { prisma } = require('../lib/prisma');
const { audit } = require('../lib/audit');
const { invalidateDashboardCache } = require('./dashboard.controller');
const { broadcastNotification, NOTIFICATION_TYPES } = require('../lib/notifications');

const DEAL_STAGES = ['Prospect', 'Qualified', 'Proposal', 'Won', 'Lost'];

function isDealStage(value) {
  return typeof value === 'string' && DEAL_STAGES.includes(value);
}

// GET /api/deals — returns all deals + kanban grouping
const getDeals = async (req, res) => {
  try {
    const { tenantId } = req.user;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });

    const deals = await prisma.deal.findMany({
      where: { 
        tenantId, 
        deletedAt: null,
        company: { deletedAt: null } 
      },
      include: { company: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const kanban = DEAL_STAGES.reduce((acc, s) => {
      acc[s] = deals.filter(d => d.stage === s);
      return acc;
    }, {});

    res.json({ deals, kanban });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deals', details: error.message });
  }
};

const createDeal = async (req, res) => {
  const { companyId, title, value, stage, expectedCloseDate } = req.body;
  const dealStage = stage ?? 'Prospect';
  if (!isDealStage(dealStage)) return res.status(400).json({ error: 'Invalid deal stage' });

  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: req.user.tenantId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  let parsedExpectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
  if (parsedExpectedCloseDate && Number.isNaN(parsedExpectedCloseDate.getTime())) {
    return res.status(400).json({ error: 'Invalid expectedCloseDate' });
  }

  const deal = await prisma.deal.create({
    data: {
      tenantId: req.user.tenantId,
      companyId,
      title,
      value: Number(value) || 0,
      stage: dealStage,
      expectedCloseDate: parsedExpectedCloseDate,
    },
  });

  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE', resource: 'deal', resourceId: deal.id, after: deal });
  
  // Notify team about new deal (exclude creator)
  await broadcastNotification(
    req.user.tenantId,
    'DEAL_CREATED',
    { title, message: company.name },
    { relatedEntity: 'deal', relatedEntityId: deal.id },
    [req.user.id]
  );
  
  await invalidateDashboardCache(req.user.tenantId);
  res.status(201).json(deal);
};

const updateDeal = async (req, res) => {
  const existing = await prisma.deal.findFirst({ 
    where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } 
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, value, stage, expectedCloseDate, companyId } = req.body;
  const data = {};

  if (stage !== undefined) {
    if (!isDealStage(stage)) return res.status(400).json({ error: 'Invalid deal stage' });
    data.stage = stage;
  }
  if (title !== undefined) data.title = String(title);
  if (value !== undefined) data.value = Number(value) || 0;
  if (expectedCloseDate !== undefined) {
    data.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
  }
  if (companyId !== undefined) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId: req.user.tenantId, deletedAt: null },
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    data.companyId = companyId;
  }

  const updated = await prisma.deal.update({ where: { id: req.params.id }, data });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'UPDATE', resource: 'deal', resourceId: updated.id, before: existing, after: updated });
  await invalidateDashboardCache(req.user.tenantId);
  res.json(updated);
};

const deleteDeal = async (req, res) => {
  const existing = await prisma.deal.findFirst({ 
    where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } 
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.deal.update({ 
    where: { id: req.params.id }, 
    data: { deletedAt: new Date() } 
  });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'DELETE', resource: 'deal', resourceId: req.params.id, before: existing });
  await invalidateDashboardCache(req.user.tenantId);
  res.json({ message: 'Deal soft-deleted' });
};

// PATCH /api/deals/:id/stage — Kanban drag-drop
const moveDealStage = async (req, res) => {
  const { stage } = req.body;
  if (!isDealStage(stage)) return res.status(400).json({ error: 'Invalid deal stage' });

  const existing = await prisma.deal.findFirst({ 
    where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    include: { company: { select: { name: true } } },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.deal.update({ where: { id: req.params.id }, data: { stage } });
  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'UPDATE',
    resource: 'deal',
    resourceId: updated.id,
    before: { stage: existing.stage },
    after: { stage: updated.stage },
  });

  // Send notifications for Won/Lost deals
  if (stage === 'Won') {
    await broadcastNotification(
      req.user.tenantId,
      'DEAL_WON',
      { title: existing.title, message: existing.value },
      { relatedEntity: 'deal', relatedEntityId: updated.id },
      []
    );
  } else if (stage === 'Lost') {
    await broadcastNotification(
      req.user.tenantId,
      'DEAL_LOST',
      { title: existing.title, message: existing.company?.name },
      { relatedEntity: 'deal', relatedEntityId: updated.id },
      []
    );
  }

  await invalidateDashboardCache(req.user.tenantId);
  res.json(updated);
};

module.exports = { getDeals, createDeal, updateDeal, deleteDeal, moveDealStage };
