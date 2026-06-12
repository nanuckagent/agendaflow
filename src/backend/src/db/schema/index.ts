/**
 * Drizzle ORM schema definitions - AgendaFlow multi-tenant database
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  serial,
  primaryKey,
} from 'drizzle-orm/pg-core';

// Workspaces (multi-tenancy support)
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    ownerUserId: uuid('owner_user_id').notNull(),
    primaryColor: varchar('primary_color', { length: 7 }).default('#3b5bdb'),
    sidebarColor: varchar('sidebar_color', { length: 7 }).default('#1a2d7a'),
    accentColor: varchar('accent_color', { length: 7 }).default('#0066cc'),
    logoUrl: text('logo_url'),
    timezone: varchar('timezone', { length: 50 }).default('America/Sao_Paulo'),
    currency: varchar('currency', { length: 3 }).default('BRL'),
    mercadopagoAccessTokenEnc: text('mercadopago_access_token_enc'), // Encrypted
    stripePublicKey: varchar('stripe_public_key', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex('idx_workspace_slug').on(table.slug),
  })
);

// Users
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    emailHash: varchar('email_hash', { length: 64 }).unique(),
    passwordHash: text('password_hash'),
    googleId: varchar('google_id', { length: 255 }).unique(),
    googleEmail: varchar('google_email', { length: 255 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    workspaceId: uuid('workspace_id').notNull(),
    role: varchar('role', { length: 20 }).default('member'), // admin, manager, member, professional
    active: boolean('active').default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceEmailIdx: uniqueIndex('idx_user_workspace_email').on(table.workspaceId, table.email),
    googleIdIdx: index('idx_user_google_id').on(table.googleId),
  })
);

// Appointments
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    clientName: varchar('client_name', { length: 255 }).notNull(),
    clientPhoneEnc: text('client_phone_enc'), // Encrypted
    clientEmailEnc: text('client_email_enc'), // Encrypted
    clientPhoneHash: varchar('client_phone_hash', { length: 64 }),
    professionalId: uuid('professional_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    appointmentDate: timestamp('appointment_date', { withTimezone: true }).notNull(),
    appointmentTime: varchar('appointment_time', { length: 5 }).notNull(), // HH:mm format
    durationMinutes: integer('duration_minutes').notNull().default(30),
    status: varchar('status', { length: 20 }).default('pending'), // pending, confirmed, cancelled, completed
    notes: text('notes'),
    cancellationToken: varchar('cancellation_token', { length: 255 }),
    code: varchar('code', { length: 20 }), // Booking reference code
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceDateIdx: index('idx_appointment_workspace_date').on(table.workspaceId, table.appointmentDate),
  })
);

// Professionals
export const professionals = pgTable(
  'professionals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    userId: uuid('user_id').notNull(),
    specialty: varchar('specialty', { length: 100 }),
    bio: text('bio'),
    photoUrl: text('photo_url'),
    averageRating: integer('average_rating').default(0),
    totalRatings: integer('total_ratings').default(0),
    active: boolean('active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_professional_workspace').on(table.workspaceId),
  })
);

// Services
export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    priceInCents: integer('price_in_cents').notNull(), // Store as cents
    active: boolean('active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_service_workspace').on(table.workspaceId),
  })
);

// Professional <-> Service relation (which services each professional offers)
export const professionalServices = pgTable(
  'professional_services',
  {
    professionalId: uuid('professional_id').notNull(),
    serviceId: uuid('service_id').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.professionalId, table.serviceId] }),
    serviceIdx: index('idx_professional_services_service').on(table.serviceId),
  })
);

// Payments
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').notNull(),
    appointmentId: uuid('appointment_id'),
    externalId: varchar('external_id', { length: 255 }), // MercadoPago ID
    status: varchar('status', { length: 20 }).notNull(), // pending, approved, rejected, refunded
    amountInCents: integer('amount_in_cents').notNull(),
    currency: varchar('currency', { length: 3 }).default('BRL'),
    paymentMethod: varchar('payment_method', { length: 50 }), // credit_card, pix, boleto
    clientEmail: varchar('client_email', { length: 255 }),
    metadata: jsonb('metadata'), // Additional payment data
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_payment_workspace').on(table.workspaceId),
    appointmentIdx: index('idx_payment_appointment').on(table.appointmentId),
  })
);

// Refresh Tokens
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    token: varchar('token', { length: 500 }).notNull().unique(),
    workspaceId: uuid('workspace_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('idx_refresh_token_user').on(table.userId),
  })
);

// Audit Logs
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    workspaceId: uuid('workspace_id').notNull(),
    userId: uuid('user_id'),
    action: varchar('action', { length: 50 }).notNull(), // create, update, delete
    resource: varchar('resource', { length: 50 }).notNull(), // appointment, service, professional
    resourceId: varchar('resource_id', { length: 255 }).notNull(),
    changes: jsonb('changes'), // What changed
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdx: index('idx_audit_log_workspace').on(table.workspaceId),
    userIdx: index('idx_audit_log_user').on(table.userId),
  })
);
