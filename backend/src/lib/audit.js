const { prisma } = require('./prisma');

function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  if (local.length <= 1) return `*@@${domain}`;
  return `${local[0]}***@${domain}`;
}

function sanitizeUserObj(userObj) {
  if (!userObj || typeof userObj !== 'object') return userObj;
  const safe = {};
  if (userObj.name) safe.name = userObj.name;
  if (userObj.email) safe.email = maskEmail(userObj.email);
  if (userObj.role) safe.role = userObj.role;
  return safe;
}

async function audit({ tenantId, userId, action, resource, resourceId, before, after }) {
  try {
    let safeBefore = before;
    let safeAfter = after;

    if (resource === 'user') {
      safeBefore = sanitizeUserObj(before);
      safeAfter = sanitizeUserObj(after);
    }

    await prisma.auditLog.create({
      data: { tenantId, userId, action, resource, resourceId, before: safeBefore, after: safeAfter },
    });
  } catch (err) {
    console.error('[AuditLog] Failed:', err.message);
  }
}

module.exports = { audit };
