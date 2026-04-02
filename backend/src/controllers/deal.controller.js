const { prisma } = require('../lib/prisma');
const { audit } = require('../lib/audit');
const { invalidateDashboardCache } = require('./dashboard.controller');

const DEAL_STAGES = ['Prospect', 'Qualified', 'Proposal', 'Won', 'Lost'];

function isDealStage(value) {
  return typeof value === 'string' && DEAL_STAGES.includes(value);
}

// GET /api/deals — returns all deals + kanban grouping
const getDeals = async (req, res) => {
  try {
    const { tenantId } = req.user;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID missing from request' });
    }

    const deals = await prisma.deal.findMany({
      where: { tenantId, company: { deletedAt: null } },
      include: { company: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    const kanban = DEAL_STAGES.reduce((acc, s) => {
      acc[s] = deals.filter(d => d.stage === s);
      return acc;
    }, {});

    res.json({ deals, kanban });
  } catch (error) {
    console.error('[Deals] Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals', details: error.message });
  }
};

const createDeal = async (req, res) => {
  const { companyId, title, value, stage, expectedCloseDate } = req.body;

  const dealStage = stage ?? 'Prospect';
  if (!isDealStage(dealStage)) return res.status(400).json({ error: 'Invalid deal stage' });

  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: req.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  let parsedExpectedCloseDate;
  if (expectedCloseDate === undefined || expectedCloseDate === '') parsedExpectedCloseDate = undefined;
  else if (expectedCloseDate === null) parsedExpectedCloseDate = null;
  else {
    const d = new Date(expectedCloseDate);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expectedCloseDate' });
    parsedExpectedCloseDate = d;
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
  await invalidateDashboardCache(req.user.tenantId);
  res.status(201).json(deal);
};

const updateDeal = async (req, res) => {
  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
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
    if (expectedCloseDate === null || expectedCloseDate === '') data.expectedCloseDate = null;
    else {
      const d = new Date(expectedCloseDate);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expectedCloseDate' });
      data.expectedCloseDate = d;
    }
  }

  if (companyId !== undefined) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId: req.user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    data.companyId = companyId;
  }

  const updated = await prisma.deal.update({
    where: { id: req.params.id },
    data,
  });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'UPDATE', resource: 'deal', resourceId: updated.id, before: existing, after: updated });
  await invalidateDashboardCache(req.user.tenantId);
  res.json(updated);
};

// PATCH /api/deals/:id/stage — Kanban drag-drop
const moveDealStage = async (req, res) => {
  const { stage } = req.body;
  if (!isDealStage(stage)) return res.status(400).json({ error: 'Invalid deal stage' });

  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
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
  await invalidateDashboardCache(req.user.tenantId);
  res.json(updated);
};

module.exports = { getDeals, createDeal, updateDeal, moveDealStage };
