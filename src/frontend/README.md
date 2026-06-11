# AgendaFlow Frontend

A modern appointment scheduling platform frontend built with React 18, Vite, TailwindCSS, and TanStack Router.

## Features

- **Multi-tenant Architecture**: Support for multiple workspaces with isolated data
- **Google OAuth Authentication**: Secure login via Google OAuth 2.0
- **Responsive Design**: Mobile-first design with full responsiveness
- **Admin Dashboard**: Manage appointments, professionals, and services
- **Public Booking**: Self-service booking page for customers
- **Workspace Branding**: Customizable colors and logo per workspace
- **Real-time Updates**: React Query for efficient data fetching and caching
- **Internationalization**: Support for English and Portuguese (Brazil)

## Tech Stack

- **Framework**: React 18.3
- **Build Tool**: Vite 6
- **Styling**: TailwindCSS 3.4
- **Routing**: TanStack Router 1.114
- **State Management**: Zustand 5, React Context
- **Data Fetching**: React Query (TanStack Query) 5.66
- **UI Components**: Radix UI, Lucide React
- **Form Validation**: React Hook Form + Zod
- **Internationalization**: i18next
- **Error Tracking**: Sentry
- **Charts**: Recharts
- **Date Handling**: date-fns

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── layout/         # Layout components (Header, Sidebar)
│   └── workspace/      # Workspace-related components
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   └── useWorkspace.ts # Workspace context hook
├── i18n/               # Internationalization
│   ├── index.ts        # i18next setup
│   ├── en.json         # English translations
│   └── pt-BR.json      # Portuguese translations
├── lib/                # Utility functions
│   ├── api.ts          # API client with auth/workspace headers
│   ├── colors.ts       # Color utilities for branding
│   └── query-client.ts # React Query client setup
├── queries/            # React Query hooks
│   ├── appointments.ts
│   ├── professionals.ts
│   ├── services.ts
│   └── workspaces.ts
├── routes/             # Page routes (TanStack Router)
│   ├── __root.tsx      # Root layout
│   ├── index.tsx       # Landing page
│   ├── oauth.callback.tsx
│   ├── onboarding/     # Workspace creation
│   ├── booking/        # Public booking flow
│   └── dashboard/      # Admin dashboard
├── stores/             # Zustand state stores
│   ├── auth-store.ts
│   └── workspace-store.ts
├── styles/             # Global styles
│   └── globals.css
├── main.tsx            # React entry point
├── App.tsx             # Root component
└── index.css           # Tailwind imports
```

## Installation

```bash
# Install dependencies
npm install

# Install shared types
npm install agendaflow-shared --workspace

# Set environment variables
cp .env.example .env.local
```

## Environment Variables

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:8000
VITE_SENTRY_DSN=
```

## Development

```bash
# Start development server
npm run dev

# Run type checker
npm run typecheck

# Format code
npm run format

# Run tests
npm run test
npm run test:watch
npm run test:coverage

# Run E2E tests
npm run e2e
npm run e2e:ui
```

## Building

```bash
# Build for production
npm run build

# Build with type checking
npm run build:strict

# Preview production build
npm run preview
```

## API Routes

The frontend communicates with the backend API. Key endpoints:

### Authentication
- `GET /v1/auth/google` - Initiate Google OAuth flow
- `POST /v1/auth/google/callback` - Handle OAuth callback

### Workspaces
- `POST /v1/workspaces` - Create workspace
- `GET /v1/workspaces/:id` - Get workspace details
- `PATCH /v1/workspaces/:id` - Update workspace branding
- `GET /v1/user/workspaces` - List user's workspaces

### Appointments
- `POST /v1/appointments/book` - Create public booking
- `GET /v1/appointments/:code` - Get public appointment by code
- `GET /v1/appointments` - List admin appointments
- `PATCH /v1/appointments/:id` - Update appointment
- `POST /v1/appointments/:id/cancel` - Cancel appointment

### Professionals
- `POST /v1/professionals` - Create professional
- `GET /v1/professionals` - List professionals
- `GET /v1/professionals/:id` - Get professional details
- `PATCH /v1/professionals/:id` - Update professional
- `DELETE /v1/professionals/:id` - Delete professional

### Services
- `POST /v1/services` - Create service
- `GET /v1/services` - List services
- `GET /v1/services/:id` - Get service details
- `PATCH /v1/services/:id` - Update service
- `DELETE /v1/services/:id` - Delete service

## Authentication Flow

1. User clicks "Sign Up with Google"
2. Redirects to `/v1/auth/google` backend endpoint
3. Backend generates Google OAuth URL and redirects user
4. User authenticates with Google
5. Google redirects back to `/oauth/callback?code=...`
6. Frontend exchanges code for JWT token
7. Token stored in localStorage and Zustand store
8. User redirected to dashboard or onboarding

## Workspace Management

- Users can have multiple workspaces
- Active workspace stored in Zustand and localStorage
- All API requests include `X-Workspace-Id` header
- Branding colors applied via CSS custom properties
- JWT token added to `Authorization` header automatically

## Styling

### TailwindCSS

Use standard Tailwind classes for styling. Custom components defined in `globals.css`:

- `.btn-primary`, `.btn-secondary`, `.btn-danger` - Button variants
- `.card` - Card container with rounded borders and shadow
- `.input-base` - Input field base styling
- `.label-base` - Label styling

### CSS Custom Properties

Workspace colors applied via CSS variables:

```css
:root {
  --workspace-primary: 59, 91, 219;  /* RGB values */
  --workspace-sidebar: 26, 45, 122;
  --workspace-accent: 0, 102, 204;
}
```

Use in Tailwind: `bg-primary`, `bg-secondary`, `bg-accent`

## Component Guidelines

### Creating New Pages

1. Create route file in `src/routes/`
2. Use `createFileRoute()` from TanStack Router
3. Export component function and route definition
4. Implement authentication check if needed

### Creating New Queries

1. Create hook file in `src/queries/`
2. Use `useQuery()` and `useMutation()` from React Query
3. Export hooks for use in components
4. Use `apiClient` for API calls

### Creating New Components

1. Create component file in `src/components/`
2. Export default function component
3. Use TypeScript for prop types
4. Include JSDoc comments for documentation

## Testing

### Unit Tests

Use Vitest for unit tests:

```bash
npm run test
npm run test:watch
npm run test:coverage
```

### E2E Tests

Use Playwright for end-to-end tests:

```bash
npm run e2e
npm run e2e:ui
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Docker Compose

See `docker-compose.yml` for multi-container setup with Nginx reverse proxy.

### Environment-specific Builds

```bash
# Development
npm run build -- --mode development

# Staging
npm run build -- --mode staging

# Production
npm run build -- --mode production
```

## Best Practices

### Code Organization
- Keep components small and focused
- Extract business logic to custom hooks
- Use composition over inheritance
- Organize imports alphabetically

### Performance
- Use React Query for efficient data fetching
- Implement pagination for large lists
- Lazy load routes with TanStack Router
- Memoize expensive computations

### Accessibility
- Add ARIA labels to interactive elements
- Use semantic HTML
- Test keyboard navigation
- Maintain color contrast ratios

### Security
- Never store sensitive data in localStorage
- Validate all user inputs
- Use HTTPS in production
- Implement CSRF protection
- Sanitize HTML content

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
npm run typecheck
```

### API connection issues
- Check `VITE_API_URL` environment variable
- Verify backend is running on configured port
- Check CORS headers in browser console
- Verify JWT token is valid and not expired

### Workspace not loading
- Clear localStorage: `localStorage.clear()`
- Check that user has workspaces
- Verify workspace ID is correct
- Check API responses for errors

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Write/update tests
3. Follow code style guidelines
4. Commit with descriptive messages
5. Push and create pull request

## License

Private - AgendaFlow Platform

## Support

For issues and questions, contact the development team.
