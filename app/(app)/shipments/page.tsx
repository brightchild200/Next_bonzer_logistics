import { getShipments } from '@/lib/actions/shipments';
import { ShipmentsExportActions } from './_components/ShipmentsExportActions';
import { ShipmentsTable } from './_components/ShipmentsTable';
import { SearchInput } from './_components/SearchInput';
import { PaginationControls } from './_components/PaginationControls';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const PAGE_SIZE = 10;

interface ShipmentsPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function ShipmentsPage({ searchParams }: ShipmentsPageProps) {
  const resolvedSearchParams = await searchParams;

  const search = resolvedSearchParams.search ?? '';
  const page = parseInt(resolvedSearchParams.page ?? '1', 10);
  const offset = (page - 1) * PAGE_SIZE;

  const result = await getShipments({
    search,
    limit: PAGE_SIZE,
    offset,
  });

  if (!result.success) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Shipments" description="Error loading shipments">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Shipment
          </Button>
        </PageHeader>
        <div className="text-center py-12 text-destructive">
          Failed to load shipments: {result.error}
        </div>
      </div>
    );
  }

  const { shipments, total } = result;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Shipments" description={`${total} shipments`}>
        <ShipmentsExportActions search={search} />
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Shipment
        </Button>
      </PageHeader>

      <SearchInput initialSearch={search} />

      <ShipmentsTable shipments={shipments} total={total} search={search} page={page} />

      <PaginationControls currentPage={page} totalPages={totalPages} totalItems={total} />
    </div>
  );
}