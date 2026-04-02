const jwt = require('jsonwebtoken');
const { prisma } = require('../lib/prisma');

/**
 * CRM Authentication Middleware (JavaScript Version)
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'change-me';
    const decoded = jwt.verify(token, secret);
    
    // Attach user payload: { id, tenantId, roleId }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * CRM Permission Guard
 * @param {string} permission - e.g. "audit:read", "deals:write"
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.roleId) {
      return res.status(403).json({ error: 'No role assigned to this user' });
    }

    try {
      const role = await prisma.role.findUnique({ 
        where: { id: req.user.roleId } 
      });

      if (!role || role.tenantId !== req.user.tenantId) {
        return res.status(403).json({ error: 'Role not found or invalid for this tenant' });
      }

      const perms = role.permissions || [];
      
      // Handle legacy "companies" to "contacts" mapping
      const legacyPermission = permission.startsWith('companies:') 
        ? permission.replace('companies:', 'contacts:') 
        : null;

      // Special case: Admin (*) has all permissions
      if (perms.includes('*') || perms.includes(permission) || (legacyPermission && perms.includes(legacyPermission))) {
        return next();
      }

      console.warn(`[RBAC] Denied ${req.user.id} access to ${permission}`);
      return res.status(403).json({ error: 'Insufficient permissions', required: permission });
    } catch (error) {
      console.error('[RBAC] Error:', error.message);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

module.exports = { authenticate, requirePermission };
