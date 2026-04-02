const { prisma } = require('./prisma');

async function audit({ tenantId, userId, action, resource, resourceId, before, after }) {
  try {
    await prisma.auditLog.create({
      data: { tenantId, userId, action, resource, resourceId, before, after },
    });
  } catch (err) {
    console.error('[AuditLog] Failed:', err.message);
  }
}

module.exports = { audit };
