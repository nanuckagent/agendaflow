/**
 * Products management page (store module)
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, type Product } from '@/queries/products.js';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Plus, Edit2, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/dashboard/products/')({
  component: ProductsPage,
});

const emptyForm = {
  name: '',
  description: '',
  price: 0,
  imageUrl: '',
  active: true,
};

function ProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const { mutate: createProduct } = useCreateProduct();
  const { mutate: updateProduct } = useUpdateProduct();
  const { mutate: deleteProduct } = useDeleteProduct();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

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

    if (!formData.name.trim() || formData.price < 0) {
      alert(t('products.fillRequired'));
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      priceInCents: Math.round(formData.price * 100),
      imageUrl: formData.imageUrl.trim() || undefined,
    };

    if (editingId) {
      updateProduct({ id: editingId, data: { ...payload, active: formData.active } });
    } else {
      createProduct(payload);
    }

    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.priceInCents / 100,
      imageUrl: product.imageUrl || '',
      active: product.active,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = (productId: string) => {
    if (confirm(t('products.confirmDelete'))) {
      deleteProduct(productId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('products.title')}</h1>
          <p className="text-gray-600 mt-2">{t('products.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t('products.add')}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? t('products.edit') : t('products.addNew')}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-base">{t('products.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('products.namePlaceholder')}
                  className="input-base w-full"
                  required
                />
              </div>

              <div>
                <label className="label-base">{t('products.priceCurrency')} *</label>
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
                <label className="label-base">{t('products.imageUrl')}</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="input-base w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-base">{t('products.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('products.descriptionPlaceholder')}
                  rows={3}
                  className="input-base w-full"
                />
              </div>

              {editingId && (
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded border-gray-300 h-5 w-5"
                    />
                    <span className="font-medium text-gray-900">{t('products.active')}</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button type="button" onClick={handleCancel} className="btn-secondary">
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {editingId ? t('products.update') : t('products.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products list */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('products.name')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('products.price')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('products.status')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="text-gray-900 font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-600">{product.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(product.priceInCents / 100)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.active ? t('products.active') : t('products.inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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
            <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">{t('products.empty')}</p>
            <p className="text-gray-500 text-sm mt-1">{t('products.emptyHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
