/**
 * Landing page route
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { ArrowRight, Calendar, Users, Settings, BarChart3 } from 'lucide-react';
import { useEffect } from 'react';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigate({ to: '/dashboard' });
    }
  }, [isLoggedIn, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || ''}/v1/auth/google`;
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
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Intelligent Scheduling
            <br />
            <span className="text-blue-600">Made Simple</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AgendaFlow is a modern appointment scheduling platform designed for service businesses.
            Manage professionals, services, and appointments with ease.
          </p>
          <button
            onClick={handleGoogleLogin}
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            Get Started with Google
            <ArrowRight size={24} />
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 my-20">
          {[
            {
              icon: Calendar,
              title: 'Smart Scheduling',
              description: 'Easy appointment booking with real-time availability',
            },
            {
              icon: Users,
              title: 'Team Management',
              description: 'Manage professionals and their specialties',
            },
            {
              icon: Settings,
              title: 'Customization',
              description: 'Brand your workspace with custom colors and logo',
            },
            {
              icon: BarChart3,
              title: 'Analytics',
              description: 'Track appointments, revenue, and ratings',
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
          <h3 className="text-3xl font-bold mb-4">Ready to streamline your scheduling?</h3>
          <p className="text-lg text-blue-100 mb-8">
            Join hundreds of service businesses using AgendaFlow
          </p>
          <button
            onClick={handleGoogleLogin}
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Sign Up Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">AgendaFlow</h4>
              <p className="text-sm">Intelligent scheduling platform for service businesses</p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Contact</h5>
              <p className="text-sm">support@agendaflow.local</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 AgendaFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
