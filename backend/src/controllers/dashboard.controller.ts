import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import Redis from 'ioredis';
import { audit } from '../lib/audit';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true });

const CACHE_TTL = 300; // 5 minutes

const dashboardCacheKey = (tenantId: string): string => `dashboard:${tenantId}`;

export const invalidateDashboardCache = async (tenantId: string): Promise<void> => {
  try {
    await redis.del(dashboardCacheKey(tenantId));
  } catch {
    // Redis offline — skip invalidation
  }
};

const ACTIVITY_TYPES = ['call', 'email', 'meeting'] as const;
type ActivityType = (typeof ACTIVITY_TYPES)[number];

function isActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && (ACTIVITY_TYPES as readonly string[]).includes(value);
}

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const cacheKey = dashboardCacheKey(user!.tenantId);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json({ fromCache: true, ...JSON.parse(cached) });
      return;
    }
  } catch { /* Redis offline — proceed without cache */ }

  const [wonAgg, totalDeals, wonCount, upcomingDeals, pipelineBreakdown] = await Promise.all([
    // Won deal total value
    prisma.deal.aggregate({ where: { tenantId: user!.tenantId, stage: 'Won' }, _sum: { value: true } }),
    // Pipeline conversion base
    prisma.deal.count({ where: { tenantId: user!.tenantId } }),
    prisma.deal.count({ where: { tenantId: user!.tenantId, stage: 'Won' } }),
    // Upcoming close dates (next 7 days)
    prisma.deal.findMany({
      where: {
        tenantId: user!.tenantId,
        stage: { notIn: ['Won', 'Lost'] },
        expectedCloseDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
      },
      include: { contact: { select: { name: true } } },
      orderBy: { expectedCloseDate: 'asc' },
      take: 5,
    }),
    // Per-stage count
    prisma.deal.groupBy({
      by: ['stage'],
      where: { tenantId: user!.tenantId },
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

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  } catch { /* Redis offline */ }

  res.json({ fromCache: false, ...data });
};

// GET /api/activities/:contactId
export const getActivities = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const activities = await prisma.activity.findMany({
    where: {
      contactId: String(req.params.contactId),
      tenantId: user!.tenantId,
      contact: { deletedAt: null },
    },
    orderBy: { date: 'desc' },
  });
  res.json(activities);
};

// POST /api/activities
export const createActivity = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { contactId, type, notes, date } = req.body;

  if (!isActivityType(type)) {
    res.status(400).json({ error: 'Invalid activity type' });
    return;
  }

  const contact = await prisma.contact.findFirst({
    where: { id: String(contactId), tenantId: user!.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  const parsedDate =
    date === undefined || date === '' ? undefined :
    (date === null ? null : new Date(date));
  if (parsedDate !== undefined && parsedDate !== null && Number.isNaN(parsedDate.getTime())) {
    res.status(400).json({ error: 'Invalid date' });
    return;
  }

  const activity = await prisma.activity.create({
    data: {
      tenantId: user!.tenantId,
      contactId,
      type,
      notes,
      date: parsedDate === null ? undefined : parsedDate, // Prisma expects DateTime?; keep default when null
    },
  });

  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'CREATE',
    resource: 'activity',
    resourceId: activity.id,
    after: activity,
  });
  await invalidateDashboardCache(user!.tenantId);

  res.status(201).json(activity);
};

// GET /api/audit-logs
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { resource, resourceId, page = '1' } = req.query;
  const skip = (parseInt(String(page)) - 1) * 50;

  const where: Record<string, unknown> = { tenantId: user!.tenantId };
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
