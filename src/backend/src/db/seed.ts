/**
 * Database seed script
 * Run: npm run seed
 */

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDb, closeDb } from './index.js';
import { workspaces, users } from './schema/index.js';
import { hash } from 'argon2';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@agendaflow.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123456';

async function seed() {
  const db = await createDb();

  console.log('Seeding database...');

  const existing = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, 'demo'),
  });

  if (existing) {
    console.log('Workspace "demo" already exists, skipping seed.');
    await closeDb();
    process.exit(0);
  }

  const adminUserId = randomUUID();

  const [workspace] = await db
    .insert(workspaces)
    .values({
      slug: 'demo',
      name: 'AgendaFlow Demo',
      ownerUserId: adminUserId,
    })
    .returning();

  console.log(`Workspace created: ${workspace.slug} (${workspace.id})`);

  const passwordHash = await hash(ADMIN_PASSWORD, {
    type: 2, // Argon2id
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await db.insert(users).values({
    id: adminUserId,
    email: ADMIN_EMAIL,
    passwordHash,
    firstName: 'Admin',
    lastName: 'AgendaFlow',
    workspaceId: workspace.id,
    role: 'admin',
  });

  console.log(`Admin user created: ${ADMIN_EMAIL}`);
  console.log('Seeding complete!');

  await closeDb();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
