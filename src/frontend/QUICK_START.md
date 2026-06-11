# AgendaFlow Frontend - Quick Start Guide

Get the frontend up and running in 5 minutes.

## Prerequisites

- Node.js 20+ installed
- npm 10+ installed
- Backend API running on `http://localhost:8000`

## Setup

### 1. Install Dependencies
```bash
cd src/frontend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_API_URL=http://localhost:8000
```

### 3. Start Development Server
```bash
npm run dev
```

Access the app at `http://localhost:5173`

## Project Structure

```
src/
├── components/      # React components (Header, Sidebar, etc)
├── hooks/          # Custom hooks (useAuth, useWorkspace)
├── i18n/           # Translations (English, Portuguese)
├── lib/            # Utilities (API client, colors, etc)
├── queries/        # React Query hooks (data fetching)
├── routes/         # Page routes (TanStack Router)
├── stores/         # State management (Zustand)
├── styles/         # Global styles (Tailwind)
├── App.tsx         # Root component
└── main.tsx        # Entry point
```

## Available Routes

### Public Pages
- `/` - Landing page
- `/oauth/callback` - OAuth callback (auto-handled)
- `/onboarding` - Workspace creation
- `/booking` - Public booking flow

### Protected Pages (require login)
- `/dashboard` - Dashboard overview
- `/dashboard/appointments` - Manage appointments
- `/dashboard/professionals` - Manage professionals
- `/dashboard/services` - Manage services
- `/dashboard/settings` - Settings & branding

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Format code
npm run format

# Run tests
npm run test

# Watch tests
npm run test:watch

# E2E tests
npm run e2e
```

## Authentication Flow

1. User clicks "Sign Up with Google" on landing page
2. Redirected to `/v1/auth/google` endpoint
3. Google OAuth flow
4. Redirected back to `/oauth/callback?code=...`
5. Frontend exchanges code for JWT token
6. Token stored in localStorage and Zustand
7. User redirected to dashboard or onboarding

## API Integration

The app uses a custom `apiClient` that automatically:
- Adds `Authorization: Bearer {token}` header
- Adds `X-Workspace-Id: {id}` header
- Handles 401 responses (logout)
- Validates responses

### Example API Call
```tsx
import { apiClient } from '@/lib/api';

// GET request
const data = await apiClient.get('/v1/appointments');

// POST request
const result = await apiClient.post('/v1/appointments', {
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  // ...
});

// PATCH request
const updated = await apiClient.patch('/v1/appointments/123', {
  status: 'confirmed',
});

// DELETE request
await apiClient.delete('/v1/appointments/123');
```

## State Management

### Authentication (Zustand)
```tsx
import { useAuthStore } from '@/stores/auth-store';

const { user, token, isLoggedIn, setUser, logout } = useAuthStore();
```

### Workspace (Zustand)
```tsx
import { useWorkspaceStore } from '@/stores/workspace-store';

const { activeWorkspaceId, workspaces, setActiveWorkspace } = useWorkspaceStore();
```

### Server State (React Query)
```tsx
import { useAppointments } from '@/queries/appointments';

const { data, isLoading, error } = useAppointments();
```

## Styling

### Using Tailwind Classes
```tsx
<div className="card">
  <h2 className="text-lg font-bold text-gray-900">Title</h2>
  <button className="btn-primary">Save</button>
</div>
```

### Custom Component Classes
- `.card` - Card container (rounded, shadow, padding)
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.btn-danger` - Danger button
- `.input-base` - Input field
- `.label-base` - Form label

### Dynamic Workspace Colors
Colors are applied via CSS variables:
```css
:root {
  --workspace-primary: 59, 91, 219;    /* RGB values */
  --workspace-sidebar: 26, 45, 122;
  --workspace-accent: 0, 102, 204;
}
```

Use in classes: `bg-primary`, `bg-secondary`, `bg-accent`

## Internationalization

The app supports English and Portuguese (Brazil). 

### Use Translations
```tsx
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('common.welcome')}</h1>;
}
```

### Add New Language
1. Create translation file: `src/i18n/de.json`
2. Import in `src/i18n/index.ts`:
```tsx
import de from './de.json';

resources: {
  de: { translation: de },
}
```

## Error Handling

### API Errors
```tsx
const { data, error, isLoading } = useAppointments();

if (error) {
  return <div className="text-red-600">Error: {error.message}</div>;
}
```

### Form Validation
```tsx
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name required'),
});

const { data, error } = await schema.safeParseAsync(formData);
```

## Debugging

### React DevTools
Install Chrome extension to inspect components

### React Query DevTools
Already configured in main.tsx for development

### Browser Console
```js
// Check authentication
localStorage.getItem('auth-store')

// Check workspace
localStorage.getItem('workspace-store')

// Check API response
fetch('http://localhost:8000/v1/appointments')
  .then(r => r.json())
  .then(console.log)
```

## Performance Tips

1. **Use React Query** for server state (caching, deduplication)
2. **Memoize expensive calculations** with `useMemo()`
3. **Lazy load routes** (TanStack Router does this automatically)
4. **Use `useCallback`** for event handlers
5. **Avoid re-renders** with proper dependency arrays

## Common Issues & Solutions

### "Cannot find module" error
```bash
npm install
npm run typecheck
```

### API returns 401
- Token expired or invalid
- Check localStorage for `auth-store`
- User will be logged out automatically

### Styling not applied
- Check class name spelling
- Verify Tailwind is running: `npm run dev`
- Clear browser cache (Ctrl+Shift+Del)

### API request fails
- Verify backend is running
- Check `VITE_API_URL` in `.env.local`
- Check Network tab in browser DevTools
- Verify headers in request

## Production Deployment

### Build
```bash
npm run build:strict
```

Creates optimized `dist/` folder

### Docker
```bash
docker build -t agendaflow-frontend .
docker run -p 3000:3000 agendaflow-frontend
```

### Static Hosting
Upload `dist/` folder to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Nginx

### Environment Variables
Create `.env.production` with:
```env
VITE_API_URL=https://api.agendaflow.com
VITE_SENTRY_DSN=https://your-sentry-dsn
```

## Testing

### Unit Tests
```bash
npm run test
npm run test:watch
npm run test:coverage
```

### E2E Tests
```bash
npm run e2e
npm run e2e:ui
```

## Documentation

- [README.md](./README.md) - Full setup guide
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [COMPONENTS.md](./COMPONENTS.md) - Component documentation
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Architecture overview

## Tech Stack

- **React 18** - UI library
- **Vite 6** - Build tool
- **TailwindCSS** - Styling
- **TanStack Router** - Routing
- **React Query** - Data fetching
- **Zustand** - State management
- **TypeScript** - Type safety
- **i18next** - Translations
- **Recharts** - Charts
- **Sentry** - Error tracking

## Getting Help

1. Check documentation files above
2. Review component examples in `COMPONENTS.md`
3. Check backend API documentation
4. Search GitHub issues
5. Contact development team

## Quick Tips

- Press `Ctrl+Shift+I` to open DevTools
- Use React Query DevTools to debug caching
- Check Sentry dashboard for errors
- Use React DevTools to inspect props
- Monitor Network tab for API calls

## Next Steps

1. Explore `/src/routes/index.tsx` for landing page
2. Check `/src/components/layout/Header.tsx` for layout
3. Review `/src/queries/appointments.ts` for data fetching pattern
4. Create your first feature following patterns in `/src/routes/dashboard/`

Happy coding! 🚀
