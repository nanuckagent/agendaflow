import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';

import { queryClient } from './lib/query-client.js';
import { rootRoute } from './routes/__root.js';
import './styles/globals.css';
import './i18n/index.js';

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

const router = createRouter({
  routeTree: rootRoute,
  context: {
    queryClient,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement?.innerHTML) {
  const root = ReactDOM.createRoot(rootElement!);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Sentry.ErrorBoundary
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-red-50">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-red-900 mb-2">Something went wrong</h1>
                <p className="text-red-700 mb-4">An error occurred. Please refresh the page.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          }
        >
          <RouterProvider router={router} />
        </Sentry.ErrorBoundary>
      </QueryClientProvider>
    </React.StrictMode>
  );
}
