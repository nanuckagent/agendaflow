/**
 * Public booking page per tenant: /b/{slug}
 */

import { createFileRoute, useParams } from '@tanstack/react-router';
import { BookingFlow } from '@/components/booking/BookingFlow.js';

export const Route = createFileRoute('/b/$slug/')({
  component: TenantBookingPage,
});

function TenantBookingPage() {
  const { slug } = useParams({ from: '/b/$slug/' });
  return <BookingFlow workspaceSlug={slug} />;
}
