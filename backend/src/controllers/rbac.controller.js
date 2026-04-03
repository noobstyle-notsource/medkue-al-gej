const { prisma } = require('../lib/prisma');
const { audit } = require('../lib/audit');
const bcrypt = require('bcrypt');

const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return null;
  const cleaned = permissions
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
};

// GET /api/rbac/roles
const getRoles = async (req, res) => {
  const roles = await prisma.role.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  res.json(roles);
};

// POST /api/rbac/roles
const createRole = async (req, res) => {
  const { name, permissions } = req.body;
  const trimmedName = String(name || '').trim();
  const normalizedPermissions = normalizePermissions(permissions);

  if (!trimmedName) return res.status(400).json({ error: 'Role name is required' });
  if (!normalizedPermissions) return res.status(400).json({ error: 'permissions must be an array' });

  const exists = await prisma.role.findFirst({
    where: { tenantId: req.user.tenantId, name: trimmedName },
    select: { id: true },
  });
  if (exists) return res.status(409).json({ error: 'Role already exists' });

  const role = await prisma.role.create({
    data: {
      tenantId: req.user.tenantId,
      name: trimmedName,
      permissions: normalizedPermissions,
    },
  });

  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'CREATE',
    resource: 'role',
    resourceId: role.id,
    after: role,
  });

  res.status(201).json(role);
};

// PUT /api/rbac/roles/:id
const updateRole = async (req, res) => {
  const roleId = String(req.params.id);
  const existing = await prisma.role.findFirst({
    where: { id: roleId, tenantId: req.user.tenantId },
  });
  if (!existing) return res.status(404).json({ error: 'Role not found' });

  const { name, permissions } = req.body;
  const data = {};

  if (name !== undefined) {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return res.status(400).json({ error: 'Role name cannot be empty' });
    data.name = trimmedName;
  }

  if (permissions !== undefined) {
    const normalizedPermissions = normalizePermissions(permissions);
    if (!normalizedPermissions) return res.status(400).json({ error: 'permissions must be an array' });
    data.permissions = normalizedPermissions;
  }

  if (!Object.keys(data).length) return res.status(400).json({ error: 'No fields to update' });

  if (data.name && data.name !== existing.name) {
    const dup = await prisma.role.findFirst({
      where: { tenantId: req.user.tenantId, name: data.name, id: { not: roleId } },
      select: { id: true },
    });
    if (dup) return res.status(409).json({ error: 'Role name already in use' });
  }

  const updated = await prisma.role.update({ where: { id: roleId }, data });

  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'UPDATE',
    resource: 'role',
    resourceId: updated.id,
    before: existing,
    after: updated,
  });

  res.json(updated);
};

// GET /api/rbac/users
const getTenantUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { createdAt: 'asc' },
    include: { role: { select: { id: true, name: true, permissions: true } } },
  });
  res.json(users);
};

// PATCH /api/rbac/users/:id/role
const assignUserRole = async (req, res) => {
  const userId = String(req.params.id);
  const roleId = req.body.roleId === null ? null : (req.body.roleId ? String(req.body.roleId) : undefined);
  if (roleId === undefined) return res.status(400).json({ error: 'roleId is required (string or null)' });

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, tenantId: req.user.tenantId },
  });
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (roleId !== null) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId: req.user.tenantId },
      select: { id: true },
    });
    if (!role) return res.status(404).json({ error: 'Role not found for tenant' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: { roleId },
    include: { role: { select: { id: true, name: true, permissions: true } } },
  });

  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'UPDATE',
    resource: 'user-role',
    resourceId: updatedUser.id,
    before: { roleId: targetUser.roleId },
    after: { roleId: updatedUser.roleId },
  });

  res.json(updatedUser);
};

// POST /api/rbac/users
const createTenantUser = async (req, res) => {
  const { email, password, name, roleId } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ error: 'A user with this email already exists' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Get the default role if not specified
  let finalRoleId = roleId;
  if (!finalRoleId) {
    const defaultRole = await prisma.role.findFirst({
      where: { tenantId: req.user.tenantId, name: 'Sales' },
      select: { id: true },
    });
    finalRoleId = defaultRole?.id;
  } else {
    // Verify the role exists in this tenant
    const role = await prisma.role.findFirst({
      where: { id: finalRoleId, tenantId: req.user.tenantId },
      select: { id: true },
    });
    if (!role) return res.status(404).json({ error: 'Role not found for tenant' });
  }

  const user = await prisma.user.create({
    data: {
      tenantId: req.user.tenantId,
      email,
      password: hashedPassword,
      name,
      roleId: finalRoleId,
    },
    include: { role: { select: { id: true, name: true, permissions: true } } },
  });

  await audit({
    tenantId: req.user.tenantId,
    userId: req.user.id,
    action: 'CREATE',
    resource: 'user',
    resourceId: user.id,
    after: user,
  });

  res.status(201).json(user);
};

module.exports = { getRoles, createRole, updateRole, getTenantUsers, assignUserRole, createTenantUser };

