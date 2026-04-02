import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { audit } from '../lib/audit';
import { AuthRequest } from '../middleware/auth';
import { invalidateDashboardCache } from './dashboard.controller';

// GET /api/contacts?status=Active&search=bob&sort=name&order=asc
export const getContacts = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { status, search, sort = 'createdAt', order = 'desc', page = '1', limit = '20' } = req.query;

  const where: Record<string, unknown> = {
    tenantId: user!.tenantId,
    deletedAt: null,
  };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
      { company: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { [String(sort)]: order },
      skip,
      take: parseInt(String(limit)),
    }),
    prisma.contact.count({ where }),
  ]);

  res.json({ contacts, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
};

export const getContactById = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const contact = await prisma.contact.findFirst({
    where: { id: req.params.id, tenantId: user!.tenantId, deletedAt: null },
    include: { activities: { orderBy: { date: 'desc' } }, reminders: true },
  });
  if (!contact) { res.status(404).json({ error: 'Contact not found' }); return; }
  res.json(contact);
};

export const createContact = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { name, phone, email, company, status } = req.body;
  const contact = await prisma.contact.create({
    data: { tenantId: user!.tenantId, name, phone, email, company, status: status || 'Active' },
  });
  await audit({ tenantId: user!.tenantId, userId: user!.id, action: 'CREATE', resource: 'contact', resourceId: contact.id, after: contact });
  await invalidateDashboardCache(user!.tenantId);
  res.status(201).json(contact);
};

export const updateContact = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const existing = await prisma.contact.findFirst({ where: { id: req.params.id, tenantId: user!.tenantId, deletedAt: null } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const { name, phone, email, company, status } = req.body;
  const updated = await prisma.contact.update({
    where: { id: req.params.id },
    data: { name, phone, email, company, status },
  });
  await audit({ tenantId: user!.tenantId, userId: user!.id, action: 'UPDATE', resource: 'contact', resourceId: updated.id, before: existing, after: updated });
  await invalidateDashboardCache(user!.tenantId);
  res.json(updated);
};

export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const existing = await prisma.contact.findFirst({ where: { id: req.params.id, tenantId: user!.tenantId, deletedAt: null } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.contact.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ tenantId: user!.tenantId, userId: user!.id, action: 'DELETE', resource: 'contact', resourceId: req.params.id, before: existing });
  await invalidateDashboardCache(user!.tenantId);
  res.json({ message: 'Contact soft-deleted' });
};
