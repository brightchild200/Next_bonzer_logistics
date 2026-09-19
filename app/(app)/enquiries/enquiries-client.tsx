'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Search, Download, Package, Plane, Ship, Truck, Train, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { ExportActions } from '@/components/export-actions';
import { buildWorkbook, downloadWorkbook, formatDateForFile, openPrintWindow } from '@/lib/export-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { exportEnquiries } from '@/lib/actions/enquiries';
import type { Enquiry } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const modeIcons: Record<string, typeof Plane> = {
  air: Plane,
  sea: Ship,
  road: Truck,
  rail: Train,
};

const PAGE_SIZE = 10;

interface EnquiriesClientProps {
  initialEnquiries: Enquiry[];
  initialTotal: number;
  initialPage: number;
  totalPages: number;
  initialSearch: string;
  initialStatus: string;
  initialMode: string;
  initialSortBy: string;
  initialSortDir: 'asc' | 'desc';
  source: 'own' | 'assigned' | 'team' | 'all';
}

export function EnquiriesClient({
  initialEnquiries,
  initialTotal,
  source,
}: EnquiriesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initialEnquiries);
  const [total, setTotal] = useState(initialTotal);

  const currentPage = parseInt(searchParams.get('page') ?? '1', 10);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'all';
  const mode = searchParams.get('mode') ?? 'all';
  const sortBy = searchParams.get('sortBy') ?? 'updated_at';
  const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') ?? 'desc';

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const updateSearchParams = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams);
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      router.push(`/enquiries?${newParams.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (value: string) => {
    updateSearchParams({ search: value, page: undefined });
  };

  const handleStatusChange = (value: string) => {
    updateSearchParams({ status: value, page: undefined });
  };

  const handleModeChange = (value: string) => {
    updateSearchParams({ mode: value, page: undefined });
  };

  const handleSort = (column: string) => {
    const newSortDir = sortBy === column && sortDir === 'asc' ? 'desc' : 'asc';
    updateSearchParams({ sortBy: column, sortDir: newSortDir, page: undefined });
  };

  const handlePageChange = (page: number) => {
    updateSearchParams({ page: page > 1 ? String(page) : undefined });
  };

  const handleExport = async ({ from, to }: { from?: string; to?: string }) => {
    try {
      const result = await exportEnquiries({
        search: search || undefined,
        status: status === 'all' ? undefined : (status as any),
        mode: mode === 'all' ? undefined : mode,
        from,
        to,
      });

      if (!result.success) {
        console.error('Export failed:', result.error);
        return;
      }

      const rows = result.rows.map((e) => ({
        Reference: e.reference,
        Customer: e.customer_name ?? '',
        Origin: e.origin ?? '',
        Destination: e.destination ?? '',
        Mode: e.mode,
        Status: e.status,
        Expected: e.expected_shipment_date ?? '',
        Incoterm: e.incoterm ?? '',
        Cargo: e.cargo_type ?? '',
        Weight: e.weight_kg ?? '',
        Volume: e.volume_cbm ?? '',
      }));

      const wb = await buildWorkbook(rows, 'Enquiries');
      await downloadWorkbook(wb, `enquiries_${formatDateForFile(from || 'all')}_${formatDateForFile(to || 'all')}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handlePrint = async ({ from, to }: { from?: string; to?: string }) => {
    try {
      const result = await exportEnquiries({
        search: search || undefined,
        status: status === 'all' ? undefined : (status as any),
        mode: mode === 'all' ? undefined : mode,
        from,
        to,
      });

      if (!result.success) {
        console.error('Print failed:', result.error);
        return;
      }

      const tableHtml = `
        <table>
          <thead><tr><th>Ref</th><th>Customer</th><th>Route</th><th>Mode</th><th>Status</th><th>Expected</th></tr></thead>
          <tbody>
            ${result.rows
              .map(
                (e) =>
                  `<tr><td>${e.reference}</td><td>${e.customer_name ?? ''}</td><td>${e.origin ?? ''} → ${e.destination ?? ''}</td><td>${e.mode}</td><td>${e.status}</td><td>${e.expected_shipment_date ? new Date(e.expected_shipment_date).toLocaleDateString() : ''}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>`;

      const win = openPrintWindow({
        title: 'Enquiries',
        subtitle: `From ${from || 'start'} to ${to || 'now'}`,
        tableHtml,
      });
      win?.print();
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  const handleRowClick = (enquiryId: string) => {
    router.push(`/enquiries/${enquiryId}`);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Enquiries" description={`${total} enquiries`}>
        <ExportActions
          exportLabel="Export"
          printLabel="Print"
          disableExport={false}
          disablePrint={false}
          onExport={handleExport}
          onPrint={handlePrint}
        />
        <Button size="sm" className="gap-1.5" onClick={() => router.push('/enquiries/new')}>
          <Plus className="h-4 w-4" /> New Enquiry
        </Button>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search enquiries…"
              className="pl-9"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-input bg-background h-10 px-3 py-2 rounded-md text-sm"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="quoted">Quoted</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="archived">Archived</option>
          </select>
          <select
            className="border border-input bg-background h-10 px-3 py-2 rounded-md text-sm"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value)}
          >
            <option value="all">All Modes</option>
            <option value="air">Air</option>
            <option value="sea">Sea</option>
            <option value="road">Road</option>
            <option value="rail">Rail</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table stickyHeader>
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead onClick={() => handleSort('reference')} className="cursor-pointer">
                  Reference {sortBy === 'reference' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead onClick={() => handleSort('customer_name')} className="cursor-pointer">
                  Customer {sortBy === 'customer_name' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead onClick={() => handleSort('origin')} className="cursor-pointer">
                  Route {sortBy === 'origin' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead onClick={() => handleSort('mode')} className="cursor-pointer">
                  Mode {sortBy === 'mode' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                  Status {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead onClick={() => handleSort('expected_shipment_date')} className="cursor-pointer">
                  Expected {sortBy === 'expected_shipment_date' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-base font-semibold">No enquiries yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create your first enquiry to start tracking.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                enquiries.map((e) => {
                  const ModeIcon = modeIcons[e.mode] ?? Package;
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => handleRowClick(e.id)}
                    >
                      <TableCell className="font-mono text-xs font-medium">{e.reference}</TableCell>
                      <TableCell className="font-medium">{e.customer_name ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span>{e.origin ?? '—'}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{e.destination ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs capitalize">{e.mode}</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={e.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.expected_shipment_date ? new Date(e.expected_shipment_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="gap-1">
                          <span>View</span>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} · {total} total
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}