import type { Request } from 'express';
import { AuditLog } from '../models/records';

export async function audit(
  req: Request | null,
  action: string,
  entityType: string,
  entityId: string | null,
  safeMetadata: Record<string, unknown> = {},
) {
  await AuditLog.create({
    actorId: req?.auth?.adminId ?? null,
    actorName: req?.auth?.username ?? 'system',
    action,
    entityType,
    entityId,
    safeMetadata,
  });
}
