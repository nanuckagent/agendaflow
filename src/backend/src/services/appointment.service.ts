/**
 * Appointment service
 * Handles appointment booking, scheduling, and management
 */

import { eq, and, gte, lte } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { appointments, professionals, services, users } from '../db/schema/index.js';
import { encryptPII, hashPhone, generateReferenceCode } from '../lib/crypto.js';

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
   * Calculate available time slots for a professional
   */
  async calculateAvailability(
    professionalId: string,
    date: Date,
    workspaceId: string
  ): Promise<string[]> {
    // Get professional and their service slots
    const professional = await this.db.query.professionals.findFirst({
      where: and(eq(professionals.id, professionalId), eq(professionals.workspaceId, workspaceId)),
    });

    if (!professional) {
      throw new Error('Professional not found');
    }

    // Get all appointments for this professional on the date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingAppointments = await this.db.query.appointments.findMany({
      where: and(
        eq(appointments.professionalId, professionalId),
        gte(appointments.appointmentDate, dayStart),
        lte(appointments.appointmentDate, dayEnd),
        eq(appointments.status, 'confirmed')
      ),
    });

    // Generate 30-minute slots from 9 AM to 5 PM
    const slots: string[] = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Check if slot is available
        const isAvailable = !existingAppointments.some(
          (apt) => apt.appointmentTime === timeStr
        );

        if (isAvailable) {
          slots.push(timeStr);
        }
      }
    }

    return slots;
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
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, string[]>> {
    const slots: Record<string, string[]> = {};

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      slots[dateKey] = await this.calculateAvailability(professionalId, currentDate, workspaceId);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }
}
