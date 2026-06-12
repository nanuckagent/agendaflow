/**
 * Workspace service
 * Handles workspace CRUD operations and multi-tenancy
 */

import { eq, and } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { workspaces, users } from '../db/schema/index.js';
import { generateToken } from '../lib/crypto.js';

interface CreateWorkspaceInput {
  name: string;
  timezone?: string;
  currency?: string;
  primaryColor?: string;
  sidebarColor?: string;
  accentColor?: string;
}

interface UpdateWorkspaceInput {
  name?: string;
  timezone?: string;
  currency?: string;
  primaryColor?: string;
  sidebarColor?: string;
  accentColor?: string;
  logoUrl?: string;
  storeEnabled?: boolean;
  whatsappNumber?: string;
}

export class WorkspaceService {
  constructor(private db: Database) {}

  /**
   * Create a new workspace with auto-generated slug
   */
  async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    const slug = this.generateSlug(input.name);

    const result = await this.db
      .insert(workspaces)
      .values({
        slug,
        name: input.name,
        ownerUserId: userId,
        timezone: input.timezone || 'America/Sao_Paulo',
        currency: input.currency || 'BRL',
        primaryColor: input.primaryColor || '#3b5bdb',
        sidebarColor: input.sidebarColor || '#1a2d7a',
        accentColor: input.accentColor || '#0066cc',
      })
      .returning();

    return result[0];
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: string, userId?: string) {
    const query = this.db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    const workspace = await query;

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Verify ownership if userId provided
    if (userId && workspace.ownerUserId !== userId) {
      const user = await this.db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.workspaceId, workspaceId)),
      });

      if (!user) {
        throw new Error('Unauthorized');
      }
    }

    return workspace;
  }

  /**
   * Update workspace branding
   */
  async updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
    const result = await this.db
      .update(workspaces)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    return result[0];
  }

  /**
   * List all workspaces for a user
   */
  async listUserWorkspaces(userId: string) {
    return this.db.query.workspaces.findMany({
      where: eq(workspaces.ownerUserId, userId),
    });
  }

  /**
   * Invite member to workspace
   */
  async inviteMember(workspaceId: string, email: string, role: string = 'member') {
    // TODO: Implement invitation logic
    // 1. Create invitation record
    // 2. Send invitation email
    // 3. Return invitation
    throw new Error('Not implemented yet');
  }

  /**
   * Generate a clean, unique URL-safe slug (no random suffix unless needed)
   */
  async generateUniqueSlug(name: string): Promise<string> {
    const reserved = ['demo', 'admin', 'api', 'app', 'www', 'b'];

    const base =
      name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'workspace';

    const candidates = [base, ...Array.from({ length: 19 }, (_, i) => `${base}-${i + 2}`)];

    for (const candidate of candidates) {
      if (reserved.includes(candidate)) continue;
      const existing = await this.db.query.workspaces.findFirst({
        where: eq(workspaces.slug, candidate),
        columns: { id: true },
      });
      if (!existing) return candidate;
    }

    return `${base}-${generateToken(4)}`;
  }

  /**
   * Generate URL-safe slug from name
   */
  private generateSlug(name: string): string {
    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Add random suffix to ensure uniqueness
    slug += `-${generateToken(4)}`;

    return slug;
  }
}
