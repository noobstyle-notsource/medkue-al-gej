const { prisma } = require('../lib/prisma');
const { audit } = require('../lib/audit');
const { redis } = require('../lib/redis');

const ACTIVITY_TYPES = ['call', 'email', 'meeting'];
function isActivityType(value) {
  return typeof value === 'string' && ACTIVITY_TYPES.includes(value);
}

const CACHE_TTL = 300; 
const CACHE_OP_TIMEOUT_MS = 1000;
const dashboardCacheKey = (tenantId) => `dashboard:${tenantId}`;

async function safeRedisOp(operation, fallback = null) {
  try {
    return await Promise.race([
      operation(),
      new Promise((resolve) => setTimeout(() => resolve(fallback), CACHE_OP_TIMEOUT_MS)),
    ]);
  } catch {
    return fallback;
  }
}

async function invalidateDashboardCache(tenantId) {
  try {
    await redis.del(dashboardCacheKey(tenantId));
  } catch (error) {
    console.log('[Cache] Redis invalidation skipped:', error.message);
  }
}

const getDashboard = async (req, res) => {
  try {
    const { tenantId } = req.user;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID missing' });
    const cacheKey = dashboardCacheKey(tenantId);

    const cached = await safeRedisOp(() => redis.get(cacheKey), null);
    if (cached) {
      try { return res.json({ fromCache: true, ...JSON.parse(cached) }); } 
      catch (e) { console.error('[Dashboard] Cache parse error:', e); }
    }

    // Individual query wrappers to prevent total 500 if one aggregation fails
    const run = async (fn, fallback) => {
      try { return await fn(); }
      catch (e) { console.error(`[Dashboard] Query failed:`, e.message); return fallback; }
    };

    const [wonAgg, totalDeals, wonCount, upcomingDeals, pipelineBreakdown, totalContacts] = await Promise.all([
      run(() => prisma.deal.aggregate({ where: { tenantId, stage: 'Won', deletedAt: null }, _sum: { value: true } }), { _sum: { value: 0 } }),
      run(() => prisma.deal.count({ where: { tenantId, deletedAt: null } }), 0),
      run(() => prisma.deal.count({ where: { tenantId, stage: 'Won', deletedAt: null } }), 0),
      run(() => prisma.deal.findMany({
        where: {
          tenantId,
          deletedAt: null,
          stage: { notIn: ['Won', 'Lost'] },
          expectedCloseDate: { gte: new Date(), lte: new Date(Date.now() + 14 * 86400000) },
        },
        include: { company: { select: { name: true } } },
        orderBy: { expectedCloseDate: 'asc' },
        take: 10,
      }), []),
      run(() => prisma.deal.groupBy({
        by: ['stage'],
        where: { tenantId, deletedAt: null },
        _count: { stage: true },
        _sum: { value: true },
      }), []),
      run(() => prisma.company.count({ where: { tenantId, deletedAt: null } }), 0),
    ]);

    const data = {
      wonAmount: wonAgg?._sum?.value ?? 0,
      conversionRate: totalDeals > 0 ? +((wonCount / totalDeals) * 100).toFixed(1) : 0,
      totalDeals,
      wonCount,
      totalContacts,
      upcomingDeals,
      pipelineBreakdown,
    };

    await safeRedisOp(() => redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL), null);
    res.json({ fromCache: false, ...data });
  } catch (error) {
    console.error('[Dashboard] Critical failure:', error.stack);
    res.status(500).json({ error: 'Failed' });
  }
};

const getActivities = async (req, res) => {
  try {
    const companyId = req.params.companyId || req.query.companyId || null;
    const activities = await prisma.activity.findMany({
      where: {
        tenantId: req.user.tenantId,
        deletedAt: null,
        ...(companyId ? { companyId } : {}),
        company: { deletedAt: null },
      },
      orderBy: { date: 'desc' },
    });
    res.json(activities);
  } catch (error) {
    console.error('getActivities error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createActivity = async (req, res) => {
  const { companyId, type, notes, date } = req.body;
  if (!isActivityType(type)) return res.status(400).json({ error: 'Invalid type' });

  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: req.user.tenantId, deletedAt: null },
  });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const activity = await prisma.activity.create({
    data: {
      tenantId: req.user.tenantId,
      companyId,
      type,
      notes,
      date: date ? new Date(date) : new Date(),
    },
  });

  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE', resource: 'activity', resourceId: activity.id, after: activity });
  await invalidateDashboardCache(req.user.tenantId);
  res.status(201).json(activity);
};

// ─── REMINDERS (NEW) ──────────────────────────────────────────────────────────

const getReminders = async (req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { tenantId: req.user.tenantId, deletedAt: null },
      include: { company: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createReminder = async (req, res) => {
  try {
    const { message, dueDate, companyId } = req.body;
    if (!message || !dueDate) return res.status(400).json({ error: 'Message and dueDate required' });

    const reminder = await prisma.reminder.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        companyId,
        message,
        dueDate: new Date(dueDate),
        status: 'pending'
      }
    });

    await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE', resource: 'reminder', resourceId: reminder.id, after: reminder });
    res.status(201).json(reminder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const existing = await prisma.reminder.findFirst({ 
      where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } 
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    await prisma.reminder.update({ 
      where: { id: req.params.id }, 
      data: { deletedAt: new Date(), status: 'cancelled' } 
    });
    
    await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'DELETE', resource: 'reminder', resourceId: req.params.id, before: existing });
    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAuditLogs = async (req, res) => {
  const { resource, resourceId, page = '1' } = req.query;
  const skip = (parseInt(page) - 1) * 50;
  
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: req.user.tenantId, ...(resource ? { resource } : {}), ...(resourceId ? { resourceId } : {}) },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: 50,
  });
  res.json(logs);
};

module.exports = { 
  getDashboard, 
  getActivities, 
  createActivity, 
  getReminders, 
  createReminder, 
  deleteReminder, 
  getAuditLogs, 
  invalidateDashboardCache 
};
