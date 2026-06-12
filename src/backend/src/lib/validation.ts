/**
 * Validation helpers using Zod
 */

import { z, ZodError } from 'zod';

/**
 * Parse Zod validation errors into RFC 7807 format
 */
export function parseZodError(error: ZodError) {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    type: 'https://agendaflow.local/errors/validation-error',
    title: 'Validation Error',
    status: 422,
    detail: 'One or more validation errors occurred',
    errors: issues,
  };
}

/**
 * Appointment data schema
 */
export const appointmentSchema = z.object({
  clientName: z.string().min(2).max(255),
  clientPhone: z.string().regex(/^[\d+\-() ]+$/),
  clientEmail: z.string().email(),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  appointmentDate: z.coerce.date(),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

/**
 * Service data schema
 */
export const serviceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  priceInCents: z.number().int().nonnegative(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

/**
 * Professional data schema
 */
export const professionalSchema = z.object({
  name: z.string().min(1).max(255),
  specialty: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export type ProfessionalInput = z.infer<typeof professionalSchema>;

/**
 * Professional services link schema
 */
export const professionalServicesSchema = z.object({
  serviceIds: z.array(z.string().uuid()),
});

export type ProfessionalServicesInput = z.infer<typeof professionalServicesSchema>;

/**
 * Professional weekly schedule schema (weekday 0=Sunday..6=Saturday)
 */
export const scheduleSchema = z.object({
  entries: z.array(
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .refine((e) => e.startTime < e.endTime, {
        message: 'startTime must be before endTime',
      })
  ),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;

/**
 * Product data schema (store module)
 */
export const productSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  priceInCents: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional(),
  active: z.boolean().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

/**
 * Workspace data schema
 */
export const workspaceSchema = z.object({
  name: z.string().min(1).max(255),
  timezone: z.string().default('America/Sao_Paulo'),
  currency: z.string().length(3).default('BRL'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sidebarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type WorkspaceInput = z.infer<typeof workspaceSchema>;

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Self-service registration schema
 */
export const registerSchema = z.object({
  name: z.string().min(2).max(150),
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  businessName: z.string().min(2).max(255),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Safe parse with error handling
 */
export async function safeParse<T>(schema: z.Schema<T>, data: unknown): Promise<{ data?: T; error?: any }> {
  try {
    const validated = await schema.parseAsync(data);
    return { data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: parseZodError(error) };
    }
    throw error;
  }
}
