/**
 * Professionals management page
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { useProfessionals, useCreateProfessional, useUpdateProfessional, useDeactivateProfessional } from '@/queries/professionals.js';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

export const Route = createFileRoute('/dashboard/professionals/')({
  component: ProfessionalsPage,
});

function ProfessionalsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { data: professionals = [], isLoading } = useProfessionals();
  const { mutate: createProfessional } = useCreateProfessional();
  const { mutate: updateProfessional } = useUpdateProfessional();
  const { mutate: deactivateProfessional } = useDeactivateProfessional();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    bio: '',
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

    if (!formData.name.trim() || !formData.specialty.trim()) {
      alert(t('professionals.fillNameSpecialty'));
      return;
    }

    if (editingId) {
      updateProfessional({
        id: editingId,
        data: formData,
      });
    } else {
      createProfessional(formData);
    }

    setFormData({
      name: '',
      email: '',
      phone: '',
      specialty: '',
      bio: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (professional: any) => {
    setFormData({
      name: professional.name,
      email: professional.email || '',
      phone: professional.phone || '',
      specialty: professional.specialty,
      bio: professional.bio || '',
    });
    setEditingId(professional.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialty: '',
      bio: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('professionals.title')}</h1>
          <p className="text-gray-600 mt-2">{t('professionals.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t('professionals.add')}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? t('professionals.edit') : t('professionals.addNew')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-base">{t('professionals.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('professionals.namePlaceholder')}
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">{t('professionals.specialty')} *</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder={t('professionals.specialtyPlaceholder')}
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">{t('professionals.email')}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('professionals.emailPlaceholder')}
                  className="input-base w-full"
                />
              </div>

              <div>
                <label className="label-base">{t('professionals.phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t('professionals.phonePlaceholder')}
                  className="input-base w-full"
                />
              </div>
            </div>

            <div>
              <label className="label-base">{t('professionals.bio')}</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder={t('professionals.bioPlaceholder')}
                rows={4}
                className="input-base w-full"
              />
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
                {editingId ? t('professionals.update') : t('professionals.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Professionals list */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          </div>
        ) : professionals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('professionals.name')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('professionals.specialty')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('professionals.email')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('professionals.phone')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('appointments.status')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {professionals.map((pro) => (
                  <tr key={pro.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{pro.name}</td>
                    <td className="py-3 px-4 text-gray-600">{pro.specialty}</td>
                    <td className="py-3 px-4 text-gray-600">{pro.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{pro.phone || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          pro.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {pro.active ? t('professionals.active') : t('professionals.inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(pro)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit2 size={18} />
                        </button>
                        {pro.active && (
                          <button
                            onClick={() => deactivateProfessional(pro.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('professionals.deactivate')}
                          >
                            <X size={18} />
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
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">{t('professionals.empty')}</p>
            <p className="text-gray-500 text-sm mt-1">{t('professionals.emptyHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
