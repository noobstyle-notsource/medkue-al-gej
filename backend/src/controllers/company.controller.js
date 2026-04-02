const { prisma } = require('../lib/prisma');
const { audit } = require('../lib/audit');
const { invalidateDashboardCache } = require('./dashboard.controller');

// GET /api/companies?status=Active&search=acme&sort=name&order=asc&page=1&limit=20
const getCompanies = async (req, res) => {
  try {
    const { status, search, sort = 'createdAt', order = 'desc', page = '1', limit = '20' } = req.query;
    const where = { tenantId: req.user.tenantId, deletedAt: null };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const validSortFields = ['name', 'email', 'phone', 'status', 'createdAt'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';

    const [companies, total] = await Promise.all([
      prisma.company.findMany({ where, orderBy: { [sortField]: order }, skip, take: parseInt(limit) }),
      prisma.company.count({ where }),
    ]);

    res.json({ companies, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('getCompanies error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getCompanyById = async (req, res) => {
  const company = await prisma.company.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    include: { activities: { orderBy: { date: 'desc' } }, deals: true },
  });
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(company);
};

const createCompany = async (req, res) => {
  const { name, phone, email, status } = req.body;
  const company = await prisma.company.create({
    data: { tenantId: req.user.tenantId, name, phone, email, status: status || 'Active' },
  });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE', resource: 'company', resourceId: company.id, after: company });
  await invalidateDashboardCache(req.user.tenantId);
  res.status(201).json(company);
};

const updateCompany = async (req, res) => {
  const existing = await prisma.company.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, phone, email, status } = req.body;
  const updated = await prisma.company.update({ where: { id: req.params.id }, data: { name, phone, email, status } });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'UPDATE', resource: 'company', resourceId: updated.id, before: existing, after: updated });
  await invalidateDashboardCache(req.user.tenantId);
  res.json(updated);
};

const deleteCompany = async (req, res) => {
  const existing = await prisma.company.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await prisma.company.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'DELETE', resource: 'company', resourceId: req.params.id, before: existing });
  await invalidateDashboardCache(req.user.tenantId);
  res.json({ message: 'Company soft-deleted' });
};

module.exports = { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany };

