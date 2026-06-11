/**
 * Appointments management page (admin view)
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { useAppointments, useCancelAppointment } from '@/queries/appointments.js';
import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Check } from 'lucide-react';

export const Route = createFileRoute('/dashboard/appointments/')({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [filters, setFilters] = useState({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
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
    if (confirm('Are you sure you want to cancel this appointment?')) {
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
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-2">Manage all your appointments and bookings</p>
        </div>
        <button
          onClick={() => navigate({ to: '/dashboard' })}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-base">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="label-base">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="label-base">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-base w-full"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date & Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Client</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Professional</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Service</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">
                      {apt.appointmentDate} {apt.appointmentTime}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-900">{apt.clientName}</div>
                      <div className="text-gray-600 text-sm">{apt.clientEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">Professional</td>
                    <td className="py-3 px-4 text-gray-600">Service</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusBadgeColor(apt.status)}`}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {apt.status === 'pending' && (
                          <button
                            onClick={() => {}}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Confirm"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {apt.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(apt.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel"
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
            <p className="text-gray-600">No appointments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
