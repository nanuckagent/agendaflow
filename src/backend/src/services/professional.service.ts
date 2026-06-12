/**
 * Professional service
 * Handles professional CRUD operations
 */

import { eq, and, inArray } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { professionals, users, services, professionalServices } from '../db/schema/index.js';

interface CreateProfessionalInput {
  name: string;
  userId: string;
  specialty?: string;
  bio?: string;
  photoUrl?: string;
}

interface UpdateProfessionalInput {
  name?: string;
  specialty?: string;
  bio?: string;
  photoUrl?: string;
  active?: boolean;
}

export class ProfessionalService {
  constructor(private db: Database) {}

  /**
   * Create a new professional
   */
  async createProfessional(workspaceId: string, input: CreateProfessionalInput) {
    // Verify user exists and belongs to workspace
    const user = await this.db.query.users.findFirst({
      where: and(eq(users.id, input.userId), eq(users.workspaceId, workspaceId)),
    });

    if (!user) {
      throw new Error('User not found in workspace');
    }

    const result = await this.db
      .insert(professionals)
      .values({
        workspaceId,
        name: input.name,
        userId: input.userId,
        specialty: input.specialty,
        bio: input.bio,
        photoUrl: input.photoUrl,
      })
      .returning();

    return result[0];
  }

  /**
   * Get professional by ID
   */
  async getProfessional(professionalId: string, workspaceId: string) {
    const professional = await this.db.query.professionals.findFirst({
      where: and(eq(professionals.id, professionalId), eq(professionals.workspaceId, workspaceId)),
    });

    if (!professional) {
      throw new Error('Professional not found');
    }

    return professional;
  }

  /**
   * List all professionals in workspace
   */
  async listProfessionals(workspaceId: string, filters?: { active?: boolean }) {
    return this.db.query.professionals.findMany({
      where: and(
        eq(professionals.workspaceId, workspaceId),
        filters?.active !== undefined ? eq(professionals.active, filters.active) : undefined
      ),
    });
  }

  /**
   * List professionals with their linked service IDs
   */
  async listProfessionalsWithServices(workspaceId: string, filters?: { active?: boolean }) {
    const pros = await this.listProfessionals(workspaceId, filters);
    if (pros.length === 0) return [];

    const links = await this.db.query.professionalServices.findMany({
      where: inArray(
        professionalServices.professionalId,
        pros.map((p) => p.id)
      ),
    });

    return pros.map((p) => ({
      ...p,
      serviceIds: links.filter((l) => l.professionalId === p.id).map((l) => l.serviceId),
    }));
  }

  /**
   * Replace the set of services a professional offers
   */
  async setProfessionalServices(
    professionalId: string,
    workspaceId: string,
    serviceIds: string[]
  ) {
    // Throws if the professional does not belong to the workspace
    await this.getProfessional(professionalId, workspaceId);

    await this.db
      .delete(professionalServices)
      .where(eq(professionalServices.professionalId, professionalId));

    if (serviceIds.length > 0) {
      const validServices = await this.db.query.services.findMany({
        where: and(eq(services.workspaceId, workspaceId), inArray(services.id, serviceIds)),
      });

      if (validServices.length > 0) {
        await this.db
          .insert(professionalServices)
          .values(validServices.map((s) => ({ professionalId, serviceId: s.id })));
      }
    }

    return this.getProfessionalServiceIds(professionalId);
  }

  /**
   * Get linked service IDs for a professional
   */
  async getProfessionalServiceIds(professionalId: string) {
    const links = await this.db.query.professionalServices.findMany({
      where: eq(professionalServices.professionalId, professionalId),
    });
    return links.map((l) => l.serviceId);
  }

  /**
   * Update professional
   */
  async updateProfessional(
    professionalId: string,
    workspaceId: string,
    input: UpdateProfessionalInput
  ) {
    const result = await this.db
      .update(professionals)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(professionals.id, professionalId), eq(professionals.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }

  /**
   * Delete professional
   */
  async deleteProfessional(professionalId: string, workspaceId: string) {
    const result = await this.db
      .delete(professionals)
      .where(and(eq(professionals.id, professionalId), eq(professionals.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }
}
