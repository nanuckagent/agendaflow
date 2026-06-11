# Development Guide

Complete guide for developing features in AgendaFlow frontend.

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Git

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/agendaflow.git
cd agendaflow/src/frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development server
npm run dev
```

### Development Server

The dev server runs on `http://localhost:5173` by default:

```bash
npm run dev
```

Access the app at:
- Landing page: `http://localhost:5173/`
- Dashboard: `http://localhost:5173/dashboard`
- Booking: `http://localhost:5173/booking/`

## Code Structure

### File Organization

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, Sidebar)
│   ├── workspace/      # Workspace-specific components
│   └── ui/             # Generic UI components
├── hooks/              # Custom React hooks
├── i18n/               # Internationalization (i18next)
├── lib/                # Utility functions and helpers
├── queries/            # React Query hooks for API calls
├── routes/             # Page routes (file-based routing)
├── stores/             # Zustand state stores
├── styles/             # Global CSS and Tailwind imports
├── App.tsx             # Root component
└── main.tsx            # React entry point
```

### Naming Conventions

- **Components**: PascalCase, e.g., `Header.tsx`, `BrandingPreview.tsx`
- **Hooks**: Prefix with `use`, e.g., `useAuth.ts`, `useWorkspace.ts`
- **Routes**: lowercase with brackets, e.g., `dashboard.tsx`, `[id].tsx`
- **Queries**: camelCase, plural noun, e.g., `appointments.ts`
- **Stores**: kebab-case suffix with `-store`, e.g., `auth-store.ts`
- **Utilities**: lowercase descriptive, e.g., `colors.ts`, `validation.ts`

## Feature Development Workflow

### 1. Creating a New Page

```bash
# Create route file following TanStack Router conventions
touch src/routes/my-page.tsx
# or for nested routes
mkdir src/routes/my-feature
touch src/routes/my-feature/index.tsx
```

```tsx
// src/routes/my-page.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/my-page')({
  component: MyPageComponent,
});

function MyPageComponent() {
  return (
    <div>
      <h1>My Page</h1>
    </div>
  );
}
```

### 2. Creating a New Query Hook

```bash
touch src/queries/my-feature.ts
```

```tsx
// src/queries/my-feature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api.js';

interface MyData {
  id: string;
  name: string;
}

// Fetch data
export function useMyData() {
  return useQuery({
    queryKey: ['myData'],
    queryFn: () => apiClient.get<MyData[]>('/v1/my-endpoint'),
  });
}

// Create data
export function useCreateMyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<MyData, 'id'>) =>
      apiClient.post<MyData>('/v1/my-endpoint', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myData'] });
    },
  });
}

// Update data
export function useUpdateMyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MyData> }) =>
      apiClient.patch<MyData>(`/v1/my-endpoint/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myData'] });
    },
  });
}

// Delete data
export function useDeleteMyData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/my-endpoint/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myData'] });
    },
  });
}
```

### 3. Creating a New Component

```bash
mkdir src/components/my-feature
touch src/components/my-feature/MyComponent.tsx
```

```tsx
// src/components/my-feature/MyComponent.tsx
import type { ReactNode } from 'react';

interface MyComponentProps {
  title: string;
  children?: ReactNode;
  onAction?: () => void;
}

/**
 * MyComponent - Brief description of what it does
 *
 * @example
 * <MyComponent title="Title" onAction={() => console.log('clicked')} />
 */
export function MyComponent({ title, children, onAction }: MyComponentProps) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children && <div className="mt-4">{children}</div>}
      {onAction && (
        <button onClick={onAction} className="btn-primary mt-4">
          Action
        </button>
      )}
    </div>
  );
}
```

### 4. Creating a Custom Hook

```bash
touch src/hooks/useMyCustomHook.ts
```

```tsx
// src/hooks/useMyCustomHook.ts
import { useState, useCallback, useEffect } from 'react';

interface UseMyCustomHookOptions {
  initialValue?: string;
}

/**
 * useMyCustomHook - Describe what the hook does
 *
 * @param options - Hook options
 * @returns Hook state and methods
 *
 * @example
 * const { data, isLoading, error } = useMyCustomHook();
 */
export function useMyCustomHook(options: UseMyCustomHookOptions = {}) {
  const [data, setData] = useState<string | null>(options.initialValue || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch logic here
      setData('result');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
```

### 5. Creating a State Store

```bash
touch src/stores/my-feature-store.ts
```

```tsx
// src/stores/my-feature-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyFeatureState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useMyFeatureStore = create<MyFeatureState>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
    }),
    {
      name: 'my-feature-store',
    }
  )
);
```

## Testing

### Unit Tests

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

```tsx
// src/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders with title', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('calls onAction when button is clicked', () => {
    const handleAction = vi.fn();
    render(<MyComponent title="Test" onAction={handleAction} />);

    screen.getByRole('button', { name: /action/i }).click();
    expect(handleAction).toHaveBeenCalled();
  });
});
```

### E2E Tests

```bash
# Run E2E tests
npm run e2e

# Run with UI
npm run e2e:ui
```

## Best Practices

### Code Style

```tsx
// ✅ Good
const handleSubmit = async (data: FormData) => {
  try {
    await apiClient.post('/endpoint', data);
    queryClient.invalidateQueries({ queryKey: ['data'] });
  } catch (error) {
    console.error('Error submitting form', error);
  }
};

// ❌ Bad
const handleSubmit = async (data: any) => {
  const res = await fetch('/endpoint', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  // ...
};
```

### Performance

1. **Memoize expensive computations**
   ```tsx
   const memoizedValue = useMemo(() => {
     return expensiveComputation(data);
   }, [data]);
   ```

2. **Lazy load routes**
   ```tsx
   const HeavyComponent = lazy(() => import('./HeavyComponent'));

   <Suspense fallback={<Loading />}>
     <HeavyComponent />
   </Suspense>
   ```

3. **Use React Query for data fetching**
   - Automatic caching and refetching
   - Background synchronization
   - Error handling

### Accessibility

1. **Add ARIA labels**
   ```tsx
   <button aria-label="Close menu" onClick={closeMenu}>
     <X />
   </button>
   ```

2. **Use semantic HTML**
   ```tsx
   // ✅ Good
   <nav>
     <ul>
       <li><a href="/about">About</a></li>
     </ul>
   </nav>

   // ❌ Bad
   <div>
     <div onClick={() => navigate('/about')}>About</div>
   </div>
   ```

3. **Test keyboard navigation**
   - Tab through all interactive elements
   - Enter/Space should activate buttons
   - Escape should close modals

### Type Safety

```tsx
// ✅ Good - Strict typing
interface UserFormData {
  name: string;
  email: string;
  age: number;
}

const handleSubmit = (data: UserFormData) => {
  // Type-safe access
  console.log(data.name);
};

// ❌ Bad - Any types
const handleSubmit = (data: any) => {
  console.log(data.name); // Could be undefined
};
```

## Common Tasks

### Adding a New API Endpoint

1. Create query hook in `src/queries/`
2. Use `apiClient` for API calls
3. Handle errors and loading states
4. Invalidate relevant cache on mutations

```tsx
export function useMyEndpoint() {
  return useQuery({
    queryKey: ['myEndpoint'],
    queryFn: () => apiClient.get<MyData>('/v1/my-endpoint'),
  });
}
```

### Adding Authentication to a Page

```tsx
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';

export function ProtectedPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: '/' });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;

  return <div>Protected content</div>;
}
```

### Adding a Modal

```tsx
import { useState } from 'react';
import { X } from 'lucide-react';

export function MyModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Open Modal</button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Modal Title</h2>
              <button onClick={() => setOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-600 mb-6">Modal content</p>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button className="btn-primary">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

### Handling Forms with Validation

```tsx
import { useState } from 'react';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const [data, setData] = useState<FormData>({ name: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = schema.parse(data);
      console.log('Valid data:', validated);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(
          error.errors.reduce(
            (acc, err) => {
              acc[err.path[0]] = err.message;
              return acc;
            },
            {} as Record<string, string>
          )
        );
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label-base">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          className={`input-base w-full ${errors.name ? 'border-red-500' : ''}`}
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <button type="submit" className="btn-primary">
        Submit
      </button>
    </form>
  );
}
```

## Debugging

### Browser DevTools

1. **React DevTools**: Inspect component hierarchy and props
2. **Network tab**: Monitor API requests and responses
3. **Console**: Check for errors and logs
4. **Application tab**: View localStorage and cookies

### React Query DevTools

```bash
npm install @tanstack/react-query-devtools --save-dev
```

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Common Issues

**API requests failing:**
- Check VITE_API_URL environment variable
- Verify backend is running
- Check CORS headers
- Validate request/response in Network tab

**Components not updating:**
- Check React DevTools for prop changes
- Verify state updates are happening
- Check if component is memoized unexpectedly

**Styling not applying:**
- Verify Tailwind classes are spelled correctly
- Check CSS specificity conflicts
- Clear browser cache
- Rebuild with `npm run build`

## Deployment

### Production Build

```bash
npm run build:strict
```

Creates optimized build in `dist/` directory.

### Docker

```bash
docker build -t agendaflow-frontend .
docker run -p 3000:3000 agendaflow-frontend
```

### Environment Configuration

Create `.env.production` for production settings:

```env
VITE_API_URL=https://api.agendaflow.com
VITE_SENTRY_DSN=https://your-sentry-dsn
```

## Resources

- [React Documentation](https://react.dev)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://github.com/pmndrs/zustand)
- [i18next](https://www.i18next.com/)
- [Lucide Icons](https://lucide.dev)

## Support

For questions or issues:
1. Check documentation
2. Search existing issues
3. Create new issue with reproduction
4. Contact development team
