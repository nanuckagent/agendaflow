/**
 * Public booking flow (multi-step form), shared by /b/$slug and legacy /booking?workspace=
 */

import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, Check, Copy, QrCode, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api.js';
import { applyWorkspaceTheme } from '@/lib/colors.js';

export interface PublicWorkspace {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  currency: string;
  primaryColor?: string;
  sidebarColor?: string;
  accentColor?: string;
  logoUrl?: string;
  storeEnabled?: boolean;
  whatsappNumber?: string;
}

interface PublicProfessional {
  id: string;
  name: string;
  specialty?: string;
  bio?: string;
  photoUrl?: string;
}

interface PublicService {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceInCents: number;
}

interface BookingPayment {
  id: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  amountInCents: number;
}

export function usePublicWorkspace(workspaceSlug?: string) {
  return useQuery({
    queryKey: ['public-workspace', workspaceSlug],
    queryFn: () => apiClient.get<PublicWorkspace>(`/v1/public/workspaces/${workspaceSlug}`),
    enabled: !!workspaceSlug,
    retry: false,
  });
}

export function BookingFlow({ workspaceSlug }: { workspaceSlug?: string }) {
  const { t } = useTranslation();

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
  const [payment, setPayment] = useState<BookingPayment | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  const {
    data: workspace,
    isLoading: workspaceLoading,
    isError: workspaceError,
  } = usePublicWorkspace(workspaceSlug);

  const workspaceHeader = workspace ? { 'X-Workspace-Id': workspace.id } : undefined;

  useEffect(() => {
    if (workspace) {
      applyWorkspaceTheme({
        primaryColor: workspace.primaryColor || '#3b5bdb',
        sidebarColor: workspace.sidebarColor || '#1a2d7a',
        accentColor: workspace.accentColor || '#0066cc',
      });
    }
  }, [workspace]);

  const { data: professionals = [] } = useQuery({
    queryKey: ['public-professionals', workspace?.id],
    queryFn: () =>
      apiClient.get<{ data: PublicProfessional[] }>('/v1/public/professionals', workspaceHeader),
    select: (res) => res.data,
    enabled: !!workspace,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['public-services', workspace?.id, selectedProfessional],
    queryFn: () =>
      apiClient.get<{ data: PublicService[] }>(
        selectedProfessional
          ? `/v1/public/services?professionalId=${selectedProfessional}`
          : '/v1/public/services',
        workspaceHeader
      ),
    select: (res) => res.data,
    enabled: !!workspace,
  });

  const { data: slots = [], isFetching: slotsLoading } = useQuery({
    queryKey: [
      'public-availability',
      workspace?.id,
      selectedProfessional,
      selectedService,
      appointmentDate,
    ],
    queryFn: () =>
      apiClient.get<{ date: string; slots: string[] }>(
        `/v1/public/availability?professionalId=${selectedProfessional}&serviceId=${selectedService}&date=${appointmentDate}`,
        workspaceHeader
      ),
    select: (res) => res.slots,
    enabled: !!workspace && !!selectedProfessional && !!appointmentDate,
  });

  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post<{ id: string; code: string; status: string; payment: BookingPayment | null }>(
        '/v1/appointments/book',
        data,
        workspaceHeader
      ),
  });

  const { data: paymentStatus } = useQuery({
    queryKey: ['public-payment-status', payment?.id],
    queryFn: () =>
      apiClient.get<{ status: string; appointmentStatus: string | null }>(
        `/v1/public/payments/${payment!.id}/status`
      ),
    enabled: !!payment && step === 5,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data?.status === 'approved' ||
        data?.appointmentStatus === 'confirmed' ||
        data?.appointmentStatus === 'cancelled'
      ) {
        return false;
      }
      return 4000;
    },
  });

  const paymentApproved =
    paymentStatus?.status === 'approved' || paymentStatus?.appointmentStatus === 'confirmed';

  const handleCopyPix = async () => {
    if (!payment?.qrCode) return;
    try {
      await navigator.clipboard.writeText(payment.qrCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    } catch {
      // clipboard unavailable (non-HTTPS/old browser) — user can select the code manually
    }
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedProfessional('');
    setSelectedService('');
    setAppointmentDate('');
    setAppointmentTime('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setNotes('');
    setBookingCode('');
    setPayment(null);
    setPixCopied(false);
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: workspace?.currency || 'BRL',
    }).format(cents / 100);

  const handleNextStep = () => {
    if (step < 5) {
      if (step === 1 && !selectedProfessional) {
        alert(t('booking.selectProfessional'));
        return;
      }
      if (step === 2 && !selectedService) {
        alert(t('booking.selectService'));
        return;
      }
      if (step === 3 && (!appointmentDate || !appointmentTime)) {
        alert(t('booking.selectDateTime'));
        return;
      }
      if (step === 4 && (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim())) {
        alert(t('booking.fillRequired'));
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
        onSuccess: (data) => {
          setBookingCode(data.code);
          setPayment(data.payment ?? null);
          setStep(5);
        },
        onError: (error) => {
          alert(error instanceof Error ? error.message : t('errors.tryAgain'));
        },
      }
    );
  };

  if (!workspaceSlug || workspaceError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AgendaFlow</h1>
          <p className="text-gray-600">{t('booking.workspaceNotFound')}</p>
        </div>
      </div>
    );
  }

  if (workspaceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">{t('booking.loadingWorkspace')}</p>
        </div>
      </div>
    );
  }

  const progressPercentage = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-end justify-between">
          <div>
            {workspace?.logoUrl && (
              <img
                src={`${import.meta.env.VITE_API_URL || ''}${workspace.logoUrl}`}
                alt={workspace.name}
                className="h-12 mb-2 object-contain"
              />
            )}
            <p className="text-sm font-medium text-blue-600">{workspace?.name}</p>
            <h1 className="text-3xl font-bold text-gray-900">{t('booking.title')}</h1>
            <p className="text-gray-600 mt-2">{t('booking.subtitle')}</p>
          </div>
          {workspace?.storeEnabled && (
            <Link
              to="/b/$slug/loja"
              params={{ slug: workspace.slug }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <ShoppingBag size={20} />
              {t('store.title')}
            </Link>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              {t('booking.stepOf', { step, total: 5 })}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(progressPercentage)}%
            </span>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('booking.step1')}</h2>

            <div className="space-y-3">
              {professionals.length > 0 ? (
                professionals.map((professional) => (
                  <button
                    key={professional.id}
                    onClick={() => {
                      if (selectedProfessional !== professional.id) {
                        setSelectedService('');
                        setAppointmentTime('');
                      }
                      setSelectedProfessional(professional.id);
                    }}
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
                <p className="text-gray-600">{t('booking.noProfessionals')}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Service */}
        {step === 2 && (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('booking.step2')}</h2>

            <div className="space-y-3">
              {services.length > 0 ? (
                services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      if (selectedService !== service.id) {
                        setAppointmentTime('');
                      }
                      setSelectedService(service.id);
                    }}
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
                          {formatPrice(service.priceInCents)}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {service.durationMinutes} {t('services.minutes')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-gray-600">{t('booking.noServices')}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Choose Date & Time */}
        {step === 3 && (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('booking.step3')}</h2>

            <div className="space-y-4">
              <div>
                <label className="label-base">{t('booking.date')} *</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setAppointmentTime('');
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="input-base w-full"
                  required
                />
              </div>

              {appointmentDate && (
                <div>
                  <label className="label-base">{t('booking.time')} *</label>
                  {slotsLoading ? (
                    <p className="text-gray-600 text-sm py-2">{t('booking.loadingSlots')}</p>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setAppointmentTime(slot)}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                            appointmentTime === slot
                              ? 'border-blue-600 bg-blue-50 text-blue-900'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm py-2">{t('booking.noSlots')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Client Information */}
        {step === 4 && (
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('booking.step4')}</h2>

            <div className="space-y-4">
              <div>
                <label className="label-base">{t('booking.fullName')} *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Maria da Silva"
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">{t('booking.clientEmail')} *</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="maria@exemplo.com.br"
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">{t('booking.clientPhone')} *</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">{t('booking.notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('booking.notesPlaceholder')}
                  rows={4}
                  className="input-base w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation (+ PIX payment when applicable) */}
        {step === 5 && (
          <div className="card text-center">
            {payment && !paymentApproved ? (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <QrCode size={32} className="text-blue-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('booking.pixTitle')}</h2>
                <p className="text-gray-600 mb-2">
                  {t('booking.pixAmount')}{' '}
                  <span className="font-semibold text-gray-900">
                    {formatPrice(payment.amountInCents)}
                  </span>
                </p>
                <p className="text-gray-600 text-sm mb-6">{t('booking.pixInstructions')}</p>

                {payment.qrCodeBase64 && (
                  <img
                    src={`data:image/png;base64,${payment.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-56 h-56 mx-auto mb-4 border border-gray-200 rounded-lg"
                  />
                )}

                {payment.qrCode && (
                  <div className="mb-6">
                    <p className="text-xs text-gray-500 font-mono break-all bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 max-h-24 overflow-y-auto">
                      {payment.qrCode}
                    </p>
                    <button
                      onClick={handleCopyPix}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Copy size={18} />
                      {pixCopied ? t('booking.pixCopied') : t('booking.pixCopyCode')}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                  {t('booking.pixWaiting')}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <p className="text-sm text-gray-600 mb-1">{t('booking.bookingCode')}</p>
                  <p className="text-xl font-bold text-blue-900 font-mono">{bookingCode}</p>
                  <p className="text-xs text-gray-500 mt-2">{t('booking.pixHoldWarning')}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={32} className="text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {payment ? t('booking.pixConfirmed') : t('booking.bookingConfirmed')}
                </h2>
                <p className="text-gray-600 mb-6">{t('booking.successMessage')}</p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
                  <p className="text-sm text-gray-600 mb-2">{t('booking.bookingCode')}</p>
                  <p className="text-2xl font-bold text-blue-900 font-mono">{bookingCode}</p>
                  <p className="text-sm text-gray-600 mt-4">
                    {t('booking.confirmationEmail')}{' '}
                    <span className="font-medium">{clientEmail}</span>
                  </p>
                </div>

                <button onClick={resetFlow} className="btn-primary">
                  {t('booking.newBooking')}
                </button>
              </>
            )}
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
              {t('common.previous')}
            </button>

            {step === 4 ? (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? t('booking.confirming') : t('booking.confirmBooking')}
                <ArrowRight size={20} />
              </button>
            ) : (
              <button onClick={handleNextStep} className="btn-primary flex items-center gap-2">
                {t('common.next')}
                <ArrowRight size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
