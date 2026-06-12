/**
 * Product service (optional store module)
 * Handles product CRUD operations
 */

import { eq, and } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { products } from '../db/schema/index.js';

interface CreateProductInput {
  name: string;
  description?: string;
  priceInCents: number;
  imageUrl?: string;
}

interface UpdateProductInput {
  name?: string;
  description?: string;
  priceInCents?: number;
  imageUrl?: string;
  active?: boolean;
}

export class ProductService {
  constructor(private db: Database) {}

  async createProduct(workspaceId: string, input: CreateProductInput) {
    const result = await this.db
      .insert(products)
      .values({
        workspaceId,
        name: input.name,
        description: input.description,
        priceInCents: input.priceInCents,
        imageUrl: input.imageUrl,
      })
      .returning();

    return result[0];
  }

  async listProducts(workspaceId: string, filters?: { active?: boolean }) {
    return this.db.query.products.findMany({
      where: and(
        eq(products.workspaceId, workspaceId),
        filters?.active !== undefined ? eq(products.active, filters.active) : undefined
      ),
    });
  }

  async updateProduct(productId: string, workspaceId: string, input: UpdateProductInput) {
    const result = await this.db
      .update(products)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }

  async deleteProduct(productId: string, workspaceId: string) {
    const result = await this.db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }
}
