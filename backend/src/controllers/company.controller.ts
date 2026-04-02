import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { audit } from '../lib/audit';
import { AuthRequest } from '../middleware/auth';
import { invalidateDashboardCache } from './dashboard.controller';

// GET /api/companies?status=Active&search=acme&sort=name&order=asc
export const getCompanies = async (req: Request, res: Response): Promise<void> => {
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
      { phone: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));
  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { [String(sort)]: order },
      skip,
      take: parseInt(String(limit)),
    }),
    prisma.company.count({ where }),
  ]);

  res.json({ companies, total, page: parseInt(String(page)), limit: parseInt(String(limit)) });
};

export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const company = await prisma.company.findFirst({
    where: { id: req.params.id, tenantId: user!.tenantId, deletedAt: null },
    include: { activities: { orderBy: { date: 'desc' } }, deals: true },
  });
  if (!company) {
    res.status(404).json({ error: 'Company not found' });
    return;
  }
  res.json(company);
};

export const createCompany = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { name, phone, email, status } = req.body;
  const company = await prisma.company.create({
    data: { tenantId: user!.tenantId, name, phone, email, status: status || 'Active' },
  });
  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'CREATE',
    resource: 'company',
    resourceId: company.id,
    after: company,
  });
  await invalidateDashboardCache(user!.tenantId);
  res.status(201).json(company);
};

export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const existing = await prisma.company.findFirst({
    where: { id: req.params.id, tenantId: user!.tenantId, deletedAt: null },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { name, phone, email, status } = req.body;
  const updated = await prisma.company.update({
    where: { id: req.params.id },
    data: { name, phone, email, status },
  });
  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'UPDATE',
    resource: 'company',
    resourceId: updated.id,
    before: existing,
    after: updated,
  });
  await invalidateDashboardCache(user!.tenantId);
  res.json(updated);
};

export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const existing = await prisma.company.findFirst({
    where: { id: req.params.id, tenantId: user!.tenantId, deletedAt: null },
  });
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.company.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'DELETE',
    resource: 'company',
    resourceId: req.params.id,
    before: existing,
  });
  await invalidateDashboardCache(user!.tenantId);
  res.json({ message: 'Company soft-deleted' });
};

