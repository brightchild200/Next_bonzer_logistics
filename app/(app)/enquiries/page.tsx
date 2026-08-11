import { getEnquiriesPageData } from './actions';
import { EnquiriesClient } from './enquiries-client';
import type { EnquiryStatus, ListEnquiriesFilters } from '@/lib/actions/enquiries';

const PAGE_SIZE = 10;

interface EnquiriesPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    mode?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
    new?: string;
    detail?: string;
  }>;
}

export default async function EnquiriesPage({ searchParams }: EnquiriesPageProps) {
  const resolvedSearchParams = await searchParams;
  
  const search = resolvedSearchParams.search ?? '';
  const status = resolvedSearchParams.status ?? 'all';
  const mode = resolvedSearchParams.mode ?? 'all';
  const sortBy = resolvedSearchParams.sortBy ?? 'updated_at';
  const sortDir = (resolvedSearchParams.sortDir as 'asc' | 'desc') ?? 'desc';
  const page = parseInt(resolvedSearchParams.page ?? '1', 10);
  
  const offset = (page - 1) * PAGE_SIZE;
  
  const statusFilter: ListEnquiriesFilters['status'] = status === 'all' ? undefined : (status as EnquiryStatus);
  const modeFilter = mode === 'all' ? undefined : mode;

  const { enquiries, total, source } = await getEnquiriesPageData({
    search,
    status: statusFilter,
    limit: PAGE_SIZE,
    offset,
    sortBy,
    sortDir,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <EnquiriesClient
      initialEnquiries={enquiries}
      initialTotal={total}
      initialPage={page}
      totalPages={totalPages}
      initialSearch={search}
      initialStatus={status}
      initialMode={mode}
      initialSortBy={sortBy}
      initialSortDir={sortDir}
      source={source}
    />
  );
}