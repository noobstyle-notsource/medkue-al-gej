const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authorization token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requirePermission = (permission) => async (req, res, next) => {
  if (!req.user?.roleId) return res.status(403).json({ error: 'No role assigned' });
  try {
    const role = await prisma.role.findUnique({ where: { id: req.user.roleId } });
    if (!role || role.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'Role not found for tenant' });
    }
    const perms = role.permissions;
    const legacyPermission =
      typeof permission === 'string' && permission.startsWith('companies:')
        ? permission.replace(/^companies:/, 'contacts:')
        : null;

    if (
      perms.includes('*') ||
      perms.includes(permission) ||
      (legacyPermission && perms.includes(legacyPermission))
    ) {
      return next();
    }
    res.status(403).json({ error: 'Insufficient permissions', required: permission });
  } catch {
    res.status(500).json({ error: 'Permission check failed' });
  }
};

module.exports = { authenticate, requirePermission };
