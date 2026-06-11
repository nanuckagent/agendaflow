# Component Library

Documentation for AgendaFlow frontend components.

## Layout Components

### Header

Top navigation bar with workspace switcher and user menu.

```tsx
import { Header } from '@/components/layout/Header';

<Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
```

**Props:**
- `onMenuClick?: () => void` - Callback when menu toggle is clicked

### Sidebar

Left navigation sidebar with main menu items.

```tsx
import { Sidebar } from '@/components/layout/Sidebar';

<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
```

**Props:**
- `open?: boolean` - Whether sidebar is visible
- `onClose?: () => void` - Callback when sidebar should close

## Workspace Components

### BrandingPreview

Color picker and preview component for workspace branding customization.

```tsx
import { BrandingPreview } from '@/components/workspace/BrandingPreview';

<BrandingPreview
  primaryColor="#3b5bdb"
  sidebarColor="#1a2d7a"
  accentColor="#0066cc"
  logoUrl="/logo.png"
  onPrimaryChange={(color) => setPrimary(color)}
  onSidebarChange={(color) => setSidebar(color)}
  onAccentChange={(color) => setAccent(color)}
  onLogoChange={(url) => setLogo(url)}
/>
```

**Props:**
- `primaryColor: string` - Primary color in hex format
- `sidebarColor: string` - Sidebar color in hex format
- `accentColor: string` - Accent color in hex format
- `logoUrl?: string` - URL to workspace logo
- `onPrimaryChange: (color: string) => void` - Primary color change handler
- `onSidebarChange: (color: string) => void` - Sidebar color change handler
- `onAccentChange: (color: string) => void` - Accent color change handler
- `onLogoChange?: (url: string) => void` - Logo change handler

## UI Components (Tailwind)

### Button Classes

```tsx
// Primary button
<button className="btn-primary">Save</button>

// Secondary button
<button className="btn-secondary">Cancel</button>

// Danger button
<button className="btn-danger">Delete</button>
```

### Card Component

```tsx
<div className="card">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</div>
```

### Input Components

```tsx
// Text input
<input type="text" className="input-base" placeholder="Enter text" />

// Label
<label className="label-base">Label Text</label>

// Select
<select className="input-base">
  <option>Option 1</option>
  <option>Option 2</option>
</select>

// Textarea
<textarea className="input-base" placeholder="Enter text"></textarea>
```

## Form Example

```tsx
import { useState } from 'react';

export function MyForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ name, email });
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="label-base">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-base w-full"
          required
        />
      </div>

      <div>
        <label className="label-base">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base w-full"
          required
        />
      </div>

      <button type="submit" className="btn-primary w-full">
        Submit
      </button>
    </form>
  );
}
```

## Hooks

### useAuth

Get authentication state and methods.

```tsx
import { useAuth } from '@/hooks/useAuth';

export function MyComponent() {
  const { user, isLoggedIn, logout, loginWithGoogle } = useAuth();

  if (!isLoggedIn) {
    return <button onClick={loginWithGoogle}>Login with Google</button>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### useWorkspace

Get workspace context and management functions.

```tsx
import { useWorkspace } from '@/hooks/useWorkspace';

export function MyComponent() {
  const { activeWorkspaceId, workspaces, currentWorkspace, setActiveWorkspace } =
    useWorkspace();

  return (
    <div>
      <p>Active: {currentWorkspace?.name}</p>
      <select onChange={(e) => setActiveWorkspace(e.target.value)}>
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

## React Query Hooks

### Appointments

```tsx
import {
  useAppointments,
  useCreateAppointment,
  useCancelAppointment,
} from '@/queries/appointments';

// Fetch appointments with filters
const { data: appointments, isLoading } = useAppointments({
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  status: 'confirmed',
});

// Create appointment
const { mutate: createAppointment } = useCreateAppointment();
createAppointment({
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  clientPhone: '+1234567890',
  professionalId: 'prof-123',
  serviceId: 'svc-123',
  appointmentDate: '2024-01-15',
  appointmentTime: '14:00',
});

// Cancel appointment
const { mutate: cancelAppointment } = useCancelAppointment();
cancelAppointment({ appointmentId: 'apt-123' });
```

### Professionals

```tsx
import {
  useProfessionals,
  useCreateProfessional,
  useUpdateProfessional,
} from '@/queries/professionals';

const { data: professionals } = useProfessionals();

const { mutate: createProfessional } = useCreateProfessional();
createProfessional({
  name: 'John Smith',
  specialty: 'Hairstylist',
  email: 'john@example.com',
  bio: 'Experienced hairstylist...',
});
```

### Services

```tsx
import { useServices, useCreateService } from '@/queries/services';

const { data: services } = useServices();

const { mutate: createService } = useCreateService();
createService({
  name: 'Haircut',
  durationMinutes: 30,
  price: 25.00,
  description: 'Professional haircut...',
});
```

### Workspaces

```tsx
import { useWorkspaces, useCreateWorkspace, useUpdateBranding } from '@/queries/workspaces';

const { data: workspaces } = useWorkspaces();

const { mutate: createWorkspace } = useCreateWorkspace();
createWorkspace({
  name: 'My Salon',
  primaryColor: '#3b5bdb',
  sidebarColor: '#1a2d7a',
});

const { mutate: updateBranding } = useUpdateBranding();
updateBranding({
  workspaceId: 'ws-123',
  data: {
    primaryColor: '#ff0000',
  },
});
```

## Color Utilities

```tsx
import {
  validateHexColor,
  hexToRgb,
  rgbToHex,
  applyWorkspaceTheme,
  resetWorkspaceTheme,
} from '@/lib/colors';

// Validate hex color
if (validateHexColor('#3b5bdb')) {
  console.log('Valid color');
}

// Convert hex to RGB
const rgb = hexToRgb('#3b5bdb');
// { r: 59, g: 91, b: 219 }

// Convert RGB to hex
const hex = rgbToHex(59, 91, 219);
// #3B5BDB

// Apply workspace theme to CSS
applyWorkspaceTheme({
  primaryColor: '#3b5bdb',
  sidebarColor: '#1a2d7a',
  accentColor: '#0066cc',
});

// Reset theme to defaults
resetWorkspaceTheme();
```

## Best Practices

### Component Structure

```tsx
/**
 * Component description
 */

import { useCallback, useState } from 'react';
import type { ComponentProps } from './types.js';

interface MyComponentProps {
  title: string;
  onSubmit?: (data: any) => void;
  isLoading?: boolean;
}

export function MyComponent({
  title,
  onSubmit,
  isLoading = false,
}: MyComponentProps) {
  const [state, setState] = useState('');

  const handleClick = useCallback(() => {
    onSubmit?.({ state });
  }, [state, onSubmit]);

  return (
    <div>
      <h2>{title}</h2>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Submit'}
      </button>
    </div>
  );
}
```

### Error Handling

```tsx
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';

export function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: () => fetch('/api/data').then((r) => r.json()),
  });

  if (isLoading) {
    return <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
        <p className="text-red-700">{error.message}</p>
      </div>
    );
  }

  return <div>{/* render data */}</div>;
}
```

### Accessibility

```tsx
import { ArrowRight } from 'lucide-react';

export function MyButton() {
  return (
    <button
      aria-label="Continue to next step"
      className="btn-primary"
    >
      Next
      <ArrowRight size={20} aria-hidden="true" />
    </button>
  );
}
```

## Common Patterns

### Protected Route

```tsx
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export function ProtectedPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: '/' });
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  return <div>Protected content</div>;
}
```

### Loading State with Skeleton

```tsx
export function SkeletonLoader() {
  return (
    <div className="card space-y-4">
      <div className="h-8 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}
```

### Pagination

```tsx
import { useState } from 'react';

interface PaginatedProps {
  items: any[];
  itemsPerPage: number;
}

export function Paginated({ items, itemsPerPage }: PaginatedProps) {
  const [page, setPage] = useState(1);

  const total = Math.ceil(items.length / itemsPerPage);
  const start = (page - 1) * itemsPerPage;
  const current = items.slice(start, start + itemsPerPage);

  return (
    <div>
      {current.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="btn-secondary"
        >
          Previous
        </button>

        <span className="px-4 py-2 text-gray-600">
          Page {page} of {total}
        </span>

        <button
          onClick={() => setPage((p) => Math.min(total, p + 1))}
          disabled={page === total}
          className="btn-primary"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```
