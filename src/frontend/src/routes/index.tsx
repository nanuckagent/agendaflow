/**
 * Landing page route
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { ArrowRight, Calendar, Users, Settings, BarChart3 } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigate({ to: '/dashboard' });
    }
  }, [isLoggedIn, navigate]);

  const handleGoogleLogin = () => {
    navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">AgendaFlow</h1>
            <button
              onClick={handleGoogleLogin}
              className="btn-primary"
            >
              {t('auth.login')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            {t('landing.heroTitle')}
            <br />
            <span className="text-blue-600">{t('landing.heroTitleHighlight')}</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('landing.heroSubtitle')}
          </p>
          <button
            onClick={handleGoogleLogin}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            {t('landing.getStarted')}
            <ArrowRight size={24} />
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 my-20">
          {[
            {
              icon: Calendar,
              title: t('landing.featureSchedulingTitle'),
              description: t('landing.featureSchedulingDesc'),
            },
            {
              icon: Users,
              title: t('landing.featureTeamTitle'),
              description: t('landing.featureTeamDesc'),
            },
            {
              icon: Settings,
              title: t('landing.featureCustomizationTitle'),
              description: t('landing.featureCustomizationDesc'),
            },
            {
              icon: BarChart3,
              title: t('landing.featureAnalyticsTitle'),
              description: t('landing.featureAnalyticsDesc'),
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="card hover:shadow-md transition-shadow">
                <Icon size={32} className="text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white my-20">
          <h3 className="text-3xl font-bold mb-4">{t('landing.ctaTitle')}</h3>
          <p className="text-lg text-blue-100 mb-8">
            {t('landing.ctaSubtitle')}
          </p>
          <button
            onClick={handleGoogleLogin}
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            {t('landing.signUpNow')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">AgendaFlow</h4>
              <p className="text-sm">{t('landing.footerTagline')}</p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">{t('landing.footerProduct')}</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerFeatures')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerPricing')}</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">{t('landing.footerLegal')}</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerPrivacy')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('landing.footerTerms')}</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">{t('landing.footerContact')}</h5>
              <p className="text-sm">support@agendaflow.local</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>{t('landing.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
