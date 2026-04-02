import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { audit } from '../lib/audit';
import { AuthRequest } from '../middleware/auth';

const normalizePermissions = (permissions: unknown): string[] | null => {
  if (!Array.isArray(permissions)) return null;
  const cleaned = permissions
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
};

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const roles = await prisma.role.findMany({
    where: { tenantId: user!.tenantId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  res.json(roles);
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const { name, permissions } = req.body;
  const trimmedName = String(name || '').trim();
  const normalizedPermissions = normalizePermissions(permissions);

  if (!trimmedName) { res.status(400).json({ error: 'Role name is required' }); return; }
  if (!normalizedPermissions) { res.status(400).json({ error: 'permissions must be an array' }); return; }

  const exists = await prisma.role.findFirst({
    where: { tenantId: user!.tenantId, name: trimmedName },
    select: { id: true },
  });
  if (exists) { res.status(409).json({ error: 'Role already exists' }); return; }

  const role = await prisma.role.create({
    data: { tenantId: user!.tenantId, name: trimmedName, permissions: normalizedPermissions },
  });

  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'CREATE',
    resource: 'role',
    resourceId: role.id,
    after: role,
  });

  res.status(201).json(role);
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const roleId = String(req.params.id);

  const existing = await prisma.role.findFirst({ where: { id: roleId, tenantId: user!.tenantId } });
  if (!existing) { res.status(404).json({ error: 'Role not found' }); return; }

  const { name, permissions } = req.body;
  const data: { name?: string; permissions?: string[] } = {};

  if (name !== undefined) {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) { res.status(400).json({ error: 'Role name cannot be empty' }); return; }
    data.name = trimmedName;
  }

  if (permissions !== undefined) {
    const normalizedPermissions = normalizePermissions(permissions);
    if (!normalizedPermissions) { res.status(400).json({ error: 'permissions must be an array' }); return; }
    data.permissions = normalizedPermissions;
  }

  if (!Object.keys(data).length) { res.status(400).json({ error: 'No fields to update' }); return; }

  if (data.name && data.name !== existing.name) {
    const dup = await prisma.role.findFirst({
      where: { tenantId: user!.tenantId, name: data.name, id: { not: roleId } },
      select: { id: true },
    });
    if (dup) { res.status(409).json({ error: 'Role name already in use' }); return; }
  }

  const updated = await prisma.role.update({ where: { id: roleId }, data });

  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'UPDATE',
    resource: 'role',
    resourceId: updated.id,
    before: existing,
    after: updated,
  });

  res.json(updated);
};

export const getTenantUsers = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const users = await prisma.user.findMany({
    where: { tenantId: user!.tenantId },
    orderBy: { createdAt: 'asc' },
    include: { role: { select: { id: true, name: true, permissions: true } } },
  });
  res.json(users);
};

export const assignUserRole = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  const userId = String(req.params.id);
  const roleId = req.body.roleId === null ? null : (req.body.roleId ? String(req.body.roleId) : undefined);
  if (roleId === undefined) { res.status(400).json({ error: 'roleId is required (string or null)' }); return; }

  const targetUser = await prisma.user.findFirst({
    where: { id: userId, tenantId: user!.tenantId },
  });
  if (!targetUser) { res.status(404).json({ error: 'User not found' }); return; }

  if (roleId !== null) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId: user!.tenantId },
      select: { id: true },
    });
    if (!role) { res.status(404).json({ error: 'Role not found for tenant' }); return; }
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: { roleId },
    include: { role: { select: { id: true, name: true, permissions: true } } },
  });

  await audit({
    tenantId: user!.tenantId,
    userId: user!.id,
    action: 'UPDATE',
    resource: 'user-role',
    resourceId: updatedUser.id,
    before: { roleId: targetUser.roleId },
    after: { roleId: updatedUser.roleId },
  });

  res.json(updatedUser);
};

