/**
 * Dashboard overview page
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { useAppointments } from '@/queries/appointments.js';
import { Calendar, Users, TrendingUp, Clock } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfDay, endOfDay } from 'date-fns';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
});

// Sample data for chart
const chartData = [
  { date: 'Seg', appointments: 4, revenue: 120 },
  { date: 'Ter', appointments: 3, revenue: 90 },
  { date: 'Qua', appointments: 6, revenue: 180 },
  { date: 'Qui', appointments: 5, revenue: 150 },
  { date: 'Sex', appointments: 8, revenue: 240 },
  { date: 'Sáb', appointments: 7, revenue: 210 },
  { date: 'Dom', appointments: 2, revenue: 60 },
];

function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const today = new Date();
  const { data: appointments = [], isLoading } = useAppointments({
    dateFrom: format(startOfDay(today), 'yyyy-MM-dd'),
    dateTo: format(endOfDay(today), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: '/' });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  const todayAppointments = appointments?.length || 0;
  const totalRevenue = 1250; // Mock data
  const averageRating = 4.8; // Mock data

  const KPICard = ({
    icon: Icon,
    label,
    value,
    change,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    change?: string;
  }) => (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && <p className="text-green-600 text-sm mt-2">{change}</p>}
        </div>
        <div className="text-blue-600">{Icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-2">
          {t('dashboard.welcomeMessage')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={<Calendar size={24} />}
          label={t('dashboard.todayAppointments')}
          value={todayAppointments}
          change={t('dashboard.changeFromYesterday')}
        />
        <KPICard
          icon={<TrendingUp size={24} />}
          label={t('dashboard.totalRevenue')}
          value={`$${totalRevenue}`}
          change={t('dashboard.changeThisMonth')}
        />
        <KPICard
          icon={<Users size={24} />}
          label={t('dashboard.averageRating')}
          value={averageRating}
          change={t('dashboard.ratingOutOf')}
        />
        <KPICard
          icon={<Clock size={24} />}
          label={t('dashboard.nextBooking')}
          value="2:30 PM"
          change={t('dashboard.inOneHour')}
        />
      </div>

      {/* Charts and tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments chart */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('dashboard.appointmentsThisWeek')}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="appointments"
                stroke="#3b5bdb"
                strokeWidth={2}
                dot={{ fill: '#3b5bdb', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('dashboard.quickStats')}</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.completionRate')}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex-1 h-2 bg-gray-200 rounded-full mr-3 overflow-hidden">
                  <div className="h-full bg-green-500 w-3/4" />
                </div>
                <span className="text-sm font-medium text-gray-900">75%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.cancellationRate')}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex-1 h-2 bg-gray-200 rounded-full mr-3 overflow-hidden">
                  <div className="h-full bg-red-500 w-1/4" />
                </div>
                <span className="text-sm font-medium text-gray-900">5%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.noShowRate')}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex-1 h-2 bg-gray-200 rounded-full mr-3 overflow-hidden">
                  <div className="h-full bg-orange-500 w-1/4" />
                </div>
                <span className="text-sm font-medium text-gray-900">3%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recentBookings')}</h2>
          <button
            onClick={() => navigate({ to: '/dashboard/appointments' })}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t('common.viewAll')}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          </div>
        ) : appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.client')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.professional')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.time')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.status')}</th>
                </tr>
              </thead>
              <tbody>
                {appointments.slice(0, 5).map((apt) => (
                  <tr key={apt.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{apt.clientName}</td>
                    <td className="py-3 px-4 text-gray-600">{t('appointments.professional')}</td>
                    <td className="py-3 px-4 text-gray-600">{apt.appointmentTime}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          apt.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : apt.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t(`appointments.${apt.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">{t('dashboard.noAppointmentsToday')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
