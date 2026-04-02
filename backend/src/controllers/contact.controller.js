const { prisma } = require('../lib/prisma');
const { audit } = require('../lib/audit');
const { invalidateDashboardCache } = require('./dashboard.controller');

// GET /api/contacts?status=Active&search=bob&sort=name&order=asc&page=1&limit=20
const getContacts = async (req, res) => {
  const { status, search, sort = 'createdAt', order = 'desc', page = '1', limit = '20' } = req.query;
  const where = { tenantId: req.user.tenantId, deletedAt: null };

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const validSortFields = ['name', 'email', 'company', 'status', 'createdAt'];
  const sortField = validSortFields.includes(sort) ? sort : 'createdAt';

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, orderBy: { [sortField]: order }, skip, take: parseInt(limit) }),
    prisma.contact.count({ where }),
  ]);

  res.json({ contacts, total, page: parseInt(page), limit: parseInt(limit) });
};

const getContactById = async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    include: { activities: { orderBy: { date: 'desc' } }, reminders: true, deals: true },
  });
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
};

const createContact = async (req, res) => {
  const { name, phone, email, company, status } = req.body;
  const contact = await prisma.contact.create({
    data: { tenantId: req.user.tenantId, name, phone, email, company, status: status || 'Active' },
  });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'CREATE', resource: 'contact', resourceId: contact.id, after: contact });
  await invalidateDashboardCache(req.user.tenantId);
  res.status(201).json(contact);
};

const updateContact = async (req, res) => {
  const existing = await prisma.contact.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, phone, email, company, status } = req.body;
  const updated = await prisma.contact.update({ where: { id: req.params.id }, data: { name, phone, email, company, status } });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'UPDATE', resource: 'contact', resourceId: updated.id, before: existing, after: updated });
  await invalidateDashboardCache(req.user.tenantId);
  res.json(updated);
};

const deleteContact = async (req, res) => {
  const existing = await prisma.contact.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, deletedAt: null } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  await prisma.contact.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  await audit({ tenantId: req.user.tenantId, userId: req.user.id, action: 'DELETE', resource: 'contact', resourceId: req.params.id, before: existing });
  await invalidateDashboardCache(req.user.tenantId);
  res.json({ message: 'Contact soft-deleted' });
};

module.exports = { getContacts, getContactById, createContact, updateContact, deleteContact };
