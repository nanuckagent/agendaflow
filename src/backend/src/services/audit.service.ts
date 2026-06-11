/**
 * Audit log service
 * Tracks all changes for compliance and debugging
 */

import type { Database } from '../db/index.js';
import { auditLogs } from '../db/schema/index.js';

interface AuditLogInput {
  workspaceId: string;
  userId?: string;
  action: 'create' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  constructor(private db: Database) {}

  /**
   * Create audit log entry
   */
  async log(input: AuditLogInput) {
    const result = await this.db
      .insert(auditLogs)
      .values({
        workspaceId: input.workspaceId,
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        changes: input.changes,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      })
      .returning();

    return result[0];
  }

  /**
   * Get audit logs for workspace
   */
  async getWorkspaceLogs(
    workspaceId: string,
    filters?: {
      userId?: string;
      resource?: string;
      action?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    return this.db.query.auditLogs.findMany({
      where: (logs: any) => logs.workspaceId === workspaceId,
    });
  }
}
