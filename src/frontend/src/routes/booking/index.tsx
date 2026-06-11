/**
 * Public booking page (multi-step form)
 */

import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useProfessionals } from '@/queries/professionals.js';
import { useServices } from '@/queries/services.js';
import { useCreateAppointment } from '@/queries/appointments.js';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store.js';

interface SearchParams {
  workspace?: string;
}

export const Route = createFileRoute('/booking/')({
  validateSearch: (search: Record<string, any>): SearchParams => ({
    workspace: search.workspace as string | undefined,
  }),
  component: BookingPage,
});

function BookingPage() {
  const navigate = useNavigate();
  const { workspace: workspaceSlug } = useSearch({ from: '/booking/' });
  const { setActiveWorkspace } = useWorkspaceStore();

  const [step, setStep] = useState(1);
  const [selectedProfessional, setSelectedProfessional] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingCode, setBookingCode] = useState('');

  const { data: professionals = [] } = useProfessionals();
  const { data: services = [] } = useServices();
  const { mutate: createAppointment, isPending } = useCreateAppointment();

  const handleNextStep = () => {
    if (step < 5) {
      // Validate current step
      if (step === 1 && !selectedProfessional) {
        alert('Please select a professional');
        return;
      }
      if (step === 2 && !selectedService) {
        alert('Please select a service');
        return;
      }
      if (step === 3 && (!appointmentDate || !appointmentTime)) {
        alert('Please select a date and time');
        return;
      }
      if (
        step === 4 &&
        (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim())
      ) {
        alert('Please fill in all required fields');
        return;
      }
      setStep(step + 1);
    }
  };

  const handleSubmit = () => {
    createAppointment(
      {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        professionalId: selectedProfessional,
        serviceId: selectedService,
        appointmentDate,
        appointmentTime,
        notes,
      },
      {
        onSuccess: (data: any) => {
          setBookingCode(data.code);
          setStep(5);
        },
      }
    );
  };

  const progressPercentage = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>
          <p className="text-gray-600 mt-2">
            Choose your professional, service, and preferred time
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {step} of 5
            </span>
            <span className="text-sm font-medium text-gray-600">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Step 1: Select Professional */}
        {step === 1 && (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Professional</h2>

            <div className="space-y-3">
              {professionals.length > 0 ? (
                professionals.map((professional) => (
                  <button
                    key={professional.id}
                    onClick={() => setSelectedProfessional(professional.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                      selectedProfessional === professional.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{professional.name}</p>
                    <p className="text-gray-600 text-sm">{professional.specialty}</p>
                  </button>
                ))
              ) : (
                <p className="text-gray-600">No professionals available</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Service */}
        {step === 2 && (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Service</h2>

            <div className="space-y-3">
              {services.length > 0 ? (
                services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                      selectedService === service.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{service.name}</p>
                        <p className="text-gray-600 text-sm">{service.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ${service.price.toFixed(2)}
                        </p>
                        <p className="text-gray-600 text-sm">{service.durationMinutes}m</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-gray-600">No services available</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Choose Date & Time */}
        {step === 3 && (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Date & Time</h2>

            <div className="space-y-4">
              <div>
                <label className="label-base">Date *</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">Time *</label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="input-base w-full"
                  required
                >
                  <option value="">Select a time</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                  <option value="17:00">5:00 PM</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Client Information */}
        {step === 4 && (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Information</h2>

            <div className="space-y-4">
              <div>
                <label className="label-base">Full Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John Doe"
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">Email *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">Phone *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or information?"
                  rows={4}
                  className="input-base w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="card text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={32} className="text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-6">Your appointment has been successfully booked.</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
              <p className="text-sm text-gray-600 mb-2">Booking Code</p>
              <p className="text-2xl font-bold text-blue-900 font-mono">{bookingCode}</p>
              <p className="text-sm text-gray-600 mt-4">
                A confirmation email has been sent to <span className="font-medium">{clientEmail}</span>
              </p>
            </div>

            <button
              onClick={() => navigate({ to: '/' })}
              className="btn-primary"
            >
              Back to Home
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 5 && (
          <div className="mt-8 flex gap-4 justify-between">
            <button
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft size={20} />
              Previous
            </button>

            {step === 4 ? (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Confirming...' : 'Confirm Booking'}
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleNextStep}
                className="btn-primary flex items-center gap-2"
              >
                Next
                <ArrowRight size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
