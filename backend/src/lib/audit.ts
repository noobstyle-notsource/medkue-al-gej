import { prisma } from './prisma';

type Action = 'CREATE' | 'UPDATE' | 'DELETE';

interface AuditPayload {
  tenantId: string;
  userId?: string;
  action: Action;
  resource: string;
  resourceId: string;
  before?: object | null;
  after?: object | null;
}

export async function audit(payload: AuditPayload): Promise<void> {
  try {
    await prisma.auditLog.create({ data: payload });
  } catch (err) {
    console.error('[AuditLog] Failed to write:', err);
  }
}
