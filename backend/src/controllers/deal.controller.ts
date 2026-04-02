import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { audit } from '../lib/audit';
import { AuthRequest } from '../middleware/auth';
import { reminderQueue } from '../jobs/reminder.worker';
import { invalidateDashboardCache } from './dashboard.controller';

const DEAL_STAGES = ['Prospect', 'Qualified', 'Proposal', 'Won', 'Lost'] as const;
type DealStage = (typeof DEAL_STAGES)[number];

function isDealStage(value: unknown): value is DealStage {
  return typeof value === 'string' && (DEAL_STAGES as readonly string[]).includes(value);
}

// GET /api/deals — grouped by stage for Kanban
export const getDeals = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const deals = await prisma.deal.findMany({
    where: { tenantId: user!.tenantId, contact: { deletedAt: null } },
    include: { contact: { select: { id: true, name: true, company: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  const stages: DealStage[] = ['Prospect', 'Qualified', 'Proposal', 'Won', 'Lost'];
  const kanban = stages.reduce<Record<string, typeof deals>>((acc, s) => {
    acc[s] = deals.filter(d => d.stage === s);
    return acc;
  }, {});

  res.json({ deals, kanban });
};

export const createDeal = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { contactId, title, value, stage, expectedCloseDate } = req.body;

  if (!isDealStage(stage ?? 'Prospect')) {
    res.status(400).json({ error: 'Invalid deal stage' });
    return;
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId: user!.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  let parsedExpectedCloseDate: Date | null | undefined;
  if (expectedCloseDate === undefined || expectedCloseDate === '') {
    parsedExpectedCloseDate = undefined;
  } else if (expectedCloseDate === null) {
    parsedExpectedCloseDate = null;
  } else {
    const d = new Date(expectedCloseDate);
    if (Number.isNaN(d.getTime())) {
      res.status(400).json({ error: 'Invalid expectedCloseDate' });
      return;
    }
    parsedExpectedCloseDate = d;
  }

  const dealStage: DealStage = stage ?? 'Prospect';
  const deal = await prisma.deal.create({
    data: {
      tenantId: user!.tenantId,
      contactId,
      title,
      value: Number(value) || 0,
      stage: dealStage,
      expectedCloseDate: parsedExpectedCloseDate,
    },
  });
  await audit({ tenantId: user!.tenantId, userId: user!.id, action: 'CREATE', resource: 'deal', resourceId: deal.id, after: deal });
  await invalidateDashboardCache(user!.tenantId);
  res.status(201).json(deal);
};

export const updateDeal = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId: user!.tenantId } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const { contactId, title, value, stage, expectedCloseDate } = req.body;
  const data: Record<string, unknown> = {};

  if (stage !== undefined) {
    if (!isDealStage(stage)) {
      res.status(400).json({ error: 'Invalid deal stage' });
      return;
    }
    data.stage = stage;
  }

  if (title !== undefined) data.title = String(title);
  if (value !== undefined) data.value = Number(value) || 0;

  if (expectedCloseDate !== undefined) {
    if (expectedCloseDate === null || expectedCloseDate === '') data.expectedCloseDate = null;
    else {
      const d = new Date(expectedCloseDate);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ error: 'Invalid expectedCloseDate' });
        return;
      }
      data.expectedCloseDate = d;
    }
  }

  if (contactId !== undefined) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: user!.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }
    data.contactId = contactId;
  }

  const updated = await prisma.deal.update({
    where: { id: req.params.id },
    data,
  });
  await audit({ tenantId: user!.tenantId, userId: user!.id, action: 'UPDATE', resource: 'deal', resourceId: updated.id, before: existing, after: updated });
  await invalidateDashboardCache(user!.tenantId);
  res.json(updated);
};

// PATCH /api/deals/:id/stage — Kanban drag-drop
export const moveDealStage = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { stage } = req.body;
  if (!isDealStage(stage)) {
    res.status(400).json({ error: 'Invalid deal stage' });
    return;
  }

  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, tenantId: user!.tenantId } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const updated = await prisma.deal.update({
    where: { id: req.params.id },
    data: { stage },
  });

  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'UPDATE',
    resource: 'deal',
    resourceId: updated.id,
    before: { stage: existing.stage },
    after: { stage: updated.stage },
  });
  await invalidateDashboardCache(user!.tenantId);

  res.json(updated);
};

// POST /api/reminders
export const createReminder = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { contactId, message, dueDate } = req.body;
  const due = new Date(dueDate);
  if (!dueDate || Number.isNaN(due.getTime())) {
    res.status(400).json({ error: 'Invalid dueDate' });
    return;
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId: user!.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!contact) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  const reminder = await prisma.reminder.create({
    data: { tenantId: user!.tenantId, userId: user!.id, contactId, message, dueDate: due },
  });

  const delay = Math.max(0, due.getTime() - Date.now());
  await reminderQueue.add('send-email', { reminderId: reminder.id }, { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'CREATE',
    resource: 'reminder',
    resourceId: reminder.id,
    after: reminder,
  });
  await invalidateDashboardCache(user!.tenantId);

  res.status(201).json(reminder);
};

// GET /api/reminders
export const getReminders = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const reminders = await prisma.reminder.findMany({
    where: { tenantId: user!.tenantId, contact: { deletedAt: null } },
    include: { contact: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
  });
  res.json(reminders);
};
