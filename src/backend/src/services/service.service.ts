/**
 * Service service (business services like haircut, massage, etc.)
 * Handles service CRUD operations
 */

import { eq, and } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { services } from '../db/schema/index.js';

interface CreateServiceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  priceInCents: number;
}

interface UpdateServiceInput {
  name?: string;
  description?: string;
  durationMinutes?: number;
  priceInCents?: number;
  active?: boolean;
}

export class ServiceService {
  constructor(private db: Database) {}

  /**
   * Create a new service
   */
  async createService(workspaceId: string, input: CreateServiceInput) {
    const result = await this.db
      .insert(services)
      .values({
        workspaceId,
        name: input.name,
        description: input.description,
        durationMinutes: input.durationMinutes,
        priceInCents: input.priceInCents,
      })
      .returning();

    return result[0];
  }

  /**
   * Get service by ID
   */
  async getService(serviceId: string, workspaceId: string) {
    const service = await this.db.query.services.findFirst({
      where: and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)),
    });

    if (!service) {
      throw new Error('Service not found');
    }

    return service;
  }

  /**
   * List all services in workspace
   */
  async listServices(workspaceId: string, filters?: { active?: boolean }) {
    return this.db.query.services.findMany({
      where: and(
        eq(services.workspaceId, workspaceId),
        filters?.active !== undefined ? eq(services.active, filters.active) : undefined
      ),
    });
  }

  /**
   * Update service
   */
  async updateService(serviceId: string, workspaceId: string, input: UpdateServiceInput) {
    const result = await this.db
      .update(services)
      .set(input)
      .where(and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }

  /**
   * Delete service
   */
  async deleteService(serviceId: string, workspaceId: string) {
    const result = await this.db
      .delete(services)
      .where(and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }
}
