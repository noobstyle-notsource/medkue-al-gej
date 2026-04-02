import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    roleId: string | null;
  };
}

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

export const authenticate: Handler = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'change-me';
    const decoded = jwt.verify(token, secret) as { id: string; tenantId: string; roleId: string | null };
    (req as AuthRequest).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requirePermission = (permission: string): Handler => {
  return async (req, res, next) => {
    const authReq = req as AuthRequest;
    if (!authReq.user?.roleId) {
      res.status(403).json({ error: 'No role assigned' });
      return;
    }

    try {
      const role = await prisma.role.findUnique({ where: { id: authReq.user.roleId } });
      if (!role || role.tenantId !== authReq.user.tenantId) {
        res.status(403).json({ error: 'Role not found for tenant' });
        return;
      }
      const perms: string[] = role.permissions;
      const legacyPermission =
        permission.startsWith('companies:') ? permission.replace(/^companies:/, 'contacts:') : null;

      if (perms.includes('*') || perms.includes(permission) || (legacyPermission && perms.includes(legacyPermission))) {
        return next();
      }
      res.status(403).json({ error: 'Insufficient permissions', required: permission });
    } catch {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};
