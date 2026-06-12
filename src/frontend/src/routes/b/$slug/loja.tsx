/**
 * Public store page per tenant: /b/{slug}/loja
 */

import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, CalendarDays, MessageCircle } from 'lucide-react';
import { apiClient } from '@/lib/api.js';
import { usePublicWorkspace } from '@/components/booking/BookingFlow.js';

interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  priceInCents: number;
  imageUrl?: string;
}

export const Route = createFileRoute('/b/$slug/loja')({
  component: TenantStorePage,
});

function TenantStorePage() {
  const { t } = useTranslation();
  const { slug } = useParams({ from: '/b/$slug/loja' });

  const { data: workspace, isLoading, isError } = usePublicWorkspace(slug);

  const workspaceHeader = workspace ? { 'X-Workspace-Id': workspace.id } : undefined;

  const { data: products = [] } = useQuery({
    queryKey: ['public-products', workspace?.id],
    queryFn: () =>
      apiClient.get<{ data: PublicProduct[] }>('/v1/public/products', workspaceHeader),
    select: (res) => res.data,
    enabled: !!workspace?.storeEnabled,
  });

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: workspace?.currency || 'BRL',
    }).format(cents / 100);

  const whatsappLink = (product: PublicProduct) => {
    if (!workspace?.whatsappNumber) return null;
    const phone = workspace.whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent(
      t('store.whatsappMessage', {
        product: product.name,
        price: formatPrice(product.priceInCents),
      })
    );
    return `https://wa.me/55${phone}?text=${message}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (isError || !workspace || !workspace.storeEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="card text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AgendaFlow</h1>
          <p className="text-gray-600">{t('store.notAvailable')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">{workspace.name}</p>
            <h1 className="text-3xl font-bold text-gray-900">{t('store.title')}</h1>
            <p className="text-gray-600 mt-2">{t('store.subtitle')}</p>
          </div>
          <Link
            to="/b/$slug"
            params={{ slug: workspace.slug }}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <CalendarDays size={20} />
            {t('store.bookNow')}
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const link = whatsappLink(product);
              return (
                <div key={product.id} className="card flex flex-col">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-xl mb-4"
                    />
                  )}
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  {product.description && (
                    <p className="text-gray-600 text-sm mt-1 flex-1">{product.description}</p>
                  )}
                  <p className="text-xl font-bold text-gray-900 mt-3">
                    {formatPrice(product.priceInCents)}
                  </p>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary mt-4 flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={18} />
                      {t('store.orderWhatsapp')}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">{t('store.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
