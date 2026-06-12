/**
 * Legacy public booking page (/booking?workspace=slug)
 * The canonical URL is /b/$slug; this route keeps old links working.
 */

import { createFileRoute, useSearch } from '@tanstack/react-router';
import { BookingFlow } from '@/components/booking/BookingFlow.js';

interface SearchParams {
  workspace?: string;
}

export const Route = createFileRoute('/booking/')({
  validateSearch: (search: Record<string, any>): SearchParams => ({
    workspace: search.workspace as string | undefined,
  }),
  component: BookingPage,
});

function BookingPage() {
  const { workspace } = useSearch({ from: '/booking/' });
  return <BookingFlow workspaceSlug={workspace} />;
}
