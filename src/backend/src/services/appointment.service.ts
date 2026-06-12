/**
 * Appointment service
 * Handles appointment booking, scheduling, and management
 */

import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import {
  appointments,
  professionals,
  professionalSchedules,
  services,
  users,
} from '../db/schema/index.js';
import { encryptPII, hashPhone, generateReferenceCode } from '../lib/crypto.js';

const SLOT_STEP_MINUTES = 30;
// Fallback when the professional has no schedule rows: Mon-Sat 09:00-18:00
const DEFAULT_SCHEDULE = { startTime: '09:00', endTime: '18:00', weekdays: [1, 2, 3, 4, 5, 6] };

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface BookAppointmentInput {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  professionalId: string;
  serviceId: string;
  appointmentDate: Date;
  appointmentTime: string; // HH:mm format
  notes?: string;
}

export class AppointmentService {
  constructor(private db: Database) {}

  /**
   * Calculate available time slots for a professional on a calendar date.
   * `dateStr` is a plain calendar date (yyyy-MM-dd) in the workspace timezone (BRT via TZ env).
   */
  async calculateAvailability(
    workspaceId: string,
    professionalId: string,
    dateStr: string,
    serviceId?: string
  ): Promise<string[]> {
    const professional = await this.db.query.professionals.findFirst({
      where: and(eq(professionals.id, professionalId), eq(professionals.workspaceId, workspaceId)),
    });

    if (!professional) {
      throw new Error('Professional not found');
    }

    let durationMinutes = SLOT_STEP_MINUTES;
    if (serviceId) {
      const service = await this.db.query.services.findFirst({
        where: and(eq(services.id, serviceId), eq(services.workspaceId, workspaceId)),
      });
      if (service) durationMinutes = service.durationMinutes;
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();

    const scheduleRows = await this.db.query.professionalSchedules.findMany({
      where: eq(professionalSchedules.professionalId, professionalId),
    });

    let windows: { start: number; end: number }[];
    if (scheduleRows.length > 0) {
      windows = scheduleRows
        .filter((row) => row.weekday === weekday)
        .map((row) => ({ start: toMinutes(row.startTime), end: toMinutes(row.endTime) }));
    } else if (DEFAULT_SCHEDULE.weekdays.includes(weekday)) {
      windows = [
        { start: toMinutes(DEFAULT_SCHEDULE.startTime), end: toMinutes(DEFAULT_SCHEDULE.endTime) },
      ];
    } else {
      windows = [];
    }

    if (windows.length === 0) return [];

    // Appointments are stored as UTC-midnight timestamps of the calendar date
    const dayStart = new Date(`${dateStr}T00:00:00Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59Z`);

    const existingAppointments = await this.db.query.appointments.findMany({
      where: and(
        eq(appointments.professionalId, professionalId),
        gte(appointments.appointmentDate, dayStart),
        lte(appointments.appointmentDate, dayEnd),
        inArray(appointments.status, ['pending', 'confirmed'])
      ),
    });

    const busy = existingAppointments.map((apt) => {
      const start = toMinutes(apt.appointmentTime);
      return { start, end: start + (apt.durationMinutes || SLOT_STEP_MINUTES) };
    });

    // Container runs with TZ=America/Sao_Paulo, so local time is BRT
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowMinutes = dateStr === todayStr ? now.getHours() * 60 + now.getMinutes() : -1;

    const slots: string[] = [];
    for (const window of windows) {
      for (let start = window.start; start + durationMinutes <= window.end; start += SLOT_STEP_MINUTES) {
        if (start <= nowMinutes) continue;
        const end = start + durationMinutes;
        const conflict = busy.some((b) => start < b.end && end > b.start);
        if (!conflict) slots.push(toTimeStr(start));
      }
    }

    return slots.sort();
  }

  /**
   * Book a new appointment
   */
  async bookAppointment(workspaceId: string, input: BookAppointmentInput) {
    // Verify professional and service exist
    const professional = await this.db.query.professionals.findFirst({
      where: and(eq(professionals.id, input.professionalId), eq(professionals.workspaceId, workspaceId)),
    });

    if (!professional) {
      throw new Error('Professional not found');
    }

    const service = await this.db.query.services.findFirst({
      where: and(eq(services.id, input.serviceId), eq(services.workspaceId, workspaceId)),
    });

    if (!service) {
      throw new Error('Service not found');
    }

    // Generate reference code
    const code = generateReferenceCode();

    // Encrypt PII
    const clientPhoneEnc = encryptPII(input.clientPhone, workspaceId);
    const clientEmailEnc = encryptPII(input.clientEmail, workspaceId);
    const clientPhoneHash = hashPhone(input.clientPhone);

    // Create appointment
    const result = await this.db
      .insert(appointments)
      .values({
        workspaceId,
        clientName: input.clientName,
        clientPhoneEnc,
        clientEmailEnc,
        clientPhoneHash,
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        appointmentDate: input.appointmentDate,
        appointmentTime: input.appointmentTime,
        durationMinutes: service.durationMinutes,
        status: 'pending',
        notes: input.notes,
        code,
      })
      .returning();

    return result[0];
  }

  /**
   * Confirm appointment
   */
  async confirmAppointment(appointmentId: string, workspaceId: string) {
    const result = await this.db
      .update(appointments)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(appointmentId: string, workspaceId: string, cancellationToken?: string) {
    // Verify cancellation token if provided
    const appointment = await this.db.query.appointments.findFirst({
      where: and(eq(appointments.id, appointmentId), eq(appointments.workspaceId, workspaceId)),
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (cancellationToken && appointment.cancellationToken !== cancellationToken) {
      throw new Error('Invalid cancellation token');
    }

    const result = await this.db
      .update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(appointments.id, appointmentId), eq(appointments.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }

  /**
   * List appointments with filters
   */
  async listAppointments(
    workspaceId: string,
    filters?: {
      professionalId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    let query = this.db.query.appointments.findMany({
      where: eq(appointments.workspaceId, workspaceId),
    });

    // Apply filters (Drizzle ORM query building would happen here)

    return query;
  }

  /**
   * Get available slots for a professional
   */
  async getAvailableSlots(
    workspaceId: string,
    professionalId: string,
    startDate: string,
    endDate: string,
    serviceId?: string
  ): Promise<Record<string, string[]>> {
    const slots: Record<string, string[]> = {};

    const [y, m, d] = startDate.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const lastDate = new Date(ey, em - 1, ed);

    while (currentDate <= lastDate) {
      const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      slots[dateKey] = await this.calculateAvailability(
        workspaceId,
        professionalId,
        dateKey,
        serviceId
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }
}
