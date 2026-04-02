const { prisma } = require('../lib/prisma');
const { audit } = require('../lib/audit');
const Redis = require('ioredis');

const ACTIVITY_TYPES = ['call', 'email', 'meeting'];

function isActivityType(value) {
  return typeof value === 'string' && ACTIVITY_TYPES.includes(value);
}

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 800,
  enableOfflineQueue: false,
});
let redisErrorLogged = false;
redis.on('error', (error) => {
  if (!redisErrorLogged) {
    console.log('[Cache] Redis offline — running without cache.');
    redisErrorLogged = true;
  }
});

const CACHE_TTL = 300; // seconds
const CACHE_OP_TIMEOUT_MS = 400;

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
    // Redis offline — skip invalidation
    console.log('[Cache] Redis invalidation skipped:', error.message);
  }
}

const getDashboard = async (req, res) => {
  const { tenantId } = req.user;
  const cacheKey = dashboardCacheKey(tenantId);

  const cached = await safeRedisOp(() => redis.get(cacheKey), null);
  if (cached) return res.json({ fromCache: true, ...JSON.parse(cached) });

  const [wonAgg, totalDeals, wonCount, upcomingDeals, pipelineBreakdown] = await Promise.all([
    prisma.deal.aggregate({ where: { tenantId, stage: 'Won' }, _sum: { value: true } }),
    prisma.deal.count({ where: { tenantId } }),
    prisma.deal.count({ where: { tenantId, stage: 'Won' } }),
    prisma.deal.findMany({
      where: {
        tenantId,
        stage: { notIn: ['Won', 'Lost'] },
        expectedCloseDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
      },
      include: { company: { select: { name: true } } },
      orderBy: { expectedCloseDate: 'asc' },
      take: 5,
    }),
    prisma.deal.groupBy({
      by: ['stage'],
      where: { tenantId },
      _count: { stage: true },
      _sum: { value: true },
    }),
  ]);

  const data = {
    wonAmount: wonAgg._sum.value ?? 0,
    conversionRate: totalDeals > 0 ? +((wonCount / totalDeals) * 100).toFixed(1) : 0,
    totalDeals,
    wonCount,
    upcomingDeals,
    pipelineBreakdown,
  };

  await safeRedisOp(() => redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL), null);

  res.json({ fromCache: false, ...data });
};

// GET /api/activities/:companyId
const getActivities = async (req, res) => {
  const companyId = req.params.companyId || req.query.companyId || null;
  const activities = await prisma.activity.findMany({
    where: {
      tenantId: req.user.tenantId,
      ...(companyId ? { companyId } : {}),
      company: { deletedAt: null },
    },
    orderBy: { date: 'desc' },
  });
  res.json(activities);
};

// POST /api/activities
const createActivity = async (req, res) => {
  const { companyId, type, notes, date } = req.body;

  if (!isActivityType(type)) return res.status(400).json({ error: 'Invalid activity type' });

  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: req.user.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  let parsedDate;
  if (date === undefined || date === '') parsedDate = undefined;
  else {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date' });
    parsedDate = d;
  }

  const activity = await prisma.activity.create({
    data: {
      tenantId: req.user.tenantId,
      companyId,
      type,
      notes,
      ...(parsedDate ? { date: parsedDate } : {}),
    },
  });

  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'CREATE',
    resource: 'activity',
    resourceId: activity.id,
    after: activity,
  });
  await invalidateDashboardCache(req.user.tenantId);
  res.status(201).json(activity);
};

// GET /api/audit-logs
const getAuditLogs = async (req, res) => {
  const { resource, resourceId, page = '1' } = req.query;
  const skip = (parseInt(page) - 1) * 50;
  const where = { tenantId: req.user.tenantId };
  if (resource) where.resource = resource;
  if (resourceId) where.resourceId = resourceId;

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: 50,
  });
  res.json(logs);
};

module.exports = { getDashboard, getActivities, createActivity, getAuditLogs, invalidateDashboardCache };
