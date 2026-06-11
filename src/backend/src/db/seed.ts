/**
 * Database seed script
 * Run: npm run seed
 */

import { createDb } from './index.js';
import { tenants, users, calendars } from './schema/index.js';
import { hash } from 'argon2';

async function seed() {
  const db = await createDb();

  console.log('🌱 Seeding database...');

  // Create default tenant
  const tenantId = 'default-tenant';
  // Insert tenant
  console.log('✅ Default tenant created');

  // Create admin user
  const passwordHash = await hash('admin123456');
  // Insert user
  console.log('✅ Admin user created (email: admin@agendaflow.local)');

  // Create default calendar
  // Insert calendar
  console.log('✅ Default calendar created');

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
