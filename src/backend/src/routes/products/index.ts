/**
 * Product routes (optional store module)
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../../app.js';
import { productSchema, safeParse } from '../../lib/validation.js';
import { ProductService } from '../../services/product.service.js';
import { requireAuth } from '../../middlewares/auth.js';

export const productRoutes = new Hono<{ Variables: RequestVariables }>();

// GET /v1/products - List workspace products
productRoutes.get('/products', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const productService = new ProductService((c as any).db);
  const data = await productService.listProducts(workspaceId);

  return c.json({ data }, 200);
});

// POST /v1/products - Create product
productRoutes.post('/products', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const body = await c.req.json();
  const { data, error } = await safeParse(productSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  const productService = new ProductService((c as any).db);
  const product = await productService.createProduct(workspaceId, data!);

  return c.json(product, 201);
});

// PATCH /v1/products/:id - Update product
productRoutes.patch('/products/:id', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const body = await c.req.json();
  const { data, error } = await safeParse(productSchema.partial(), body);

  if (error) {
    return c.json(error, 422);
  }

  const productService = new ProductService((c as any).db);
  const product = await productService.updateProduct(c.req.param('id'), workspaceId, data!);

  return c.json(product, 200);
});

// DELETE /v1/products/:id - Delete product
productRoutes.delete('/products/:id', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const productService = new ProductService((c as any).db);
  await productService.deleteProduct(c.req.param('id'), workspaceId);

  return c.json({ message: 'Product deleted' }, 200);
});
