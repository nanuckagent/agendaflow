/**
 * Services management page
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/queries/services.js';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Plus, Edit2, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/dashboard/services/')({
  component: ServicesPage,
});

function ServicesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { data: services = [], isLoading } = useServices();
  const { mutate: createService } = useCreateService();
  const { mutate: updateService } = useUpdateService();
  const { mutate: deleteService } = useDeleteService();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    price: 0,
    category: '',
  });

  useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: '/' });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.price < 0 || formData.durationMinutes < 1) {
      alert(t('services.fillRequired'));
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      durationMinutes: formData.durationMinutes,
      priceInCents: Math.round(formData.price * 100),
    };

    if (editingId) {
      updateService({
        id: editingId,
        data: payload,
      });
    } else {
      createService(payload);
    }

    setFormData({
      name: '',
      description: '',
      durationMinutes: 30,
      price: 0,
      category: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (service: any) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      price: service.priceInCents / 100,
      category: service.category || '',
    });
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      durationMinutes: 30,
      price: 0,
      category: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = (serviceId: string) => {
    if (confirm(t('services.confirmDelete'))) {
      deleteService(serviceId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('services.title')}</h1>
          <p className="text-gray-600 mt-2">{t('services.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t('services.add')}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? t('services.edit') : t('services.addNew')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label-base">{t('services.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('services.namePlaceholder')}
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">{t('services.durationMinutes')} *</label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })
                  }
                  placeholder="30"
                  min="1"
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">{t('services.priceCurrency')} *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) })
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="input-base w-full"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-base">{t('services.category')}</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t('services.categoryPlaceholder')}
                  className="input-base w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-base">{t('services.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('services.descriptionPlaceholder')}
                  rows={3}
                  className="input-base w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {editingId ? t('services.update') : t('services.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services list */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          </div>
        ) : services.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('services.name')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('services.category')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('services.duration')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('services.price')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="text-gray-900 font-medium">{service.name}</div>
                      {service.description && (
                        <div className="text-sm text-gray-600">{service.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{service.category || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{service.durationMinutes}m</td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(service.priceInCents / 100)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Briefcase size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">{t('services.empty')}</p>
            <p className="text-gray-500 text-sm mt-1">{t('services.emptyHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
