/**
 * Appointments management page (admin view)
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { useAppointments, useCancelAppointment } from '@/queries/appointments.js';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Trash2, Check } from 'lucide-react';
import { format, subDays } from 'date-fns';

// appointmentDate carries the literal booked date in its UTC date part;
// converting to local time would shift it to the previous day in UTC-3
const formatDateBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

export const Route = createFileRoute('/dashboard/appointments/')({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [filters, setFilters] = useState({
    dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    status: '',
  });

  const { data: appointments = [], isLoading } = useAppointments(filters);
  const { mutate: cancelAppointment } = useCancelAppointment();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: '/' });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  const handleCancel = (appointmentId: string) => {
    if (confirm(t('appointments.confirmCancel'))) {
      cancelAppointment({
        appointmentId,
        cancellationToken: undefined,
      });
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('appointments.title')}</h1>
          <p className="text-gray-600 mt-2">{t('appointments.subtitle')}</p>
        </div>
        <button
          onClick={() => navigate({ to: '/dashboard' })}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t('appointments.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('appointments.filters')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-base">{t('appointments.fromDate')}</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="label-base">{t('appointments.toDate')}</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="label-base">{t('appointments.status')}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-base w-full"
            >
              <option value="">{t('appointments.allStatuses')}</option>
              <option value="pending">{t('appointments.pending')}</option>
              <option value="confirmed">{t('appointments.confirmed')}</option>
              <option value="completed">{t('appointments.completed')}</option>
              <option value="cancelled">{t('appointments.cancelled')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments table */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          </div>
        ) : appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.dateTime')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.client')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.professional')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.service')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.status')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">
                      {formatDateBR(apt.appointmentDate)} {apt.appointmentTime}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">{apt.clientName}</div>
                      <div className="text-gray-600 text-sm">{apt.clientEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{t('appointments.professional')}</td>
                    <td className="py-3 px-4 text-gray-600">{t('appointments.service')}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusBadgeColor(apt.status)}`}
                      >
                        {t(`appointments.${apt.status}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {apt.status === 'pending' && (
                          <button
                            onClick={() => {}}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title={t('common.confirm')}
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {apt.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(apt.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('common.cancel')}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">{t('appointments.noneFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
