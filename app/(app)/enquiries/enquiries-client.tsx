'use client';

import { useState } from 'react';
import { Search, Download, Package, Plane, Ship, Truck, Train, Plus } from 'lucide-react';
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
  TablePagination,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import type { Enquiry } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const modeIcons: Record<string, typeof Plane> = {
  air: Plane,
  sea: Ship,
  road: Truck,
  rail: Train,
};

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
  initialPage,
  totalPages,
  initialSearch,
  initialStatus,
  initialMode,
  initialSortBy,
  initialSortDir,
  source,
}: EnquiriesClientProps) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initialEnquiries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage - 1);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [mode, setMode] = useState(initialMode);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
  const [loading, setLoading] = useState(false);

  const PAGE_SIZE = 10;

  const fetchEnquiries = async () => {
    setLoading(true);
    const offset = page * PAGE_SIZE;
    let query = supabase
      .from('enquiries')
      .select(
        `
        id,
        owner_id,
        reference,
        customer_id,
        customer_name,
        origin,
        destination,
        mode,
        cargo_type,
        weight_kg,
        volume_cbm,
        incoterm,
        status,
        expected_shipment_date,
        notes,
        assigned_customer_service_id,
        assigned_by,
        assigned_at,
        quoted_at,
        won_at,
        lost_at,
        archived_at,
        closed_by,
        created_at,
        updated_at
        `,
        { count: 'exact' }
      )
      .order(sortBy, { ascending: sortDir === 'asc' })
      .range(offset, offset + PAGE_SIZE - 1);

    if (search) {
      query = query.or(
        `reference.ilike.%${search}%,customer_name.ilike.%${search}%,origin.ilike.%${search}%,destination.ilike.%${search}%`
      );
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (mode !== 'all') {
      query = query.eq('mode', mode);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error(error);
    } else {
      setEnquiries(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(0);
  };

  const handleModeChange = (value: string) => {
    setMode(value);
    setPage(0);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(0);
  };

  const totalPagesCalculated = Math.ceil(total / PAGE_SIZE);
  const showSkeleton = loading && enquiries.length === 0;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Enquiries" description={`${total} enquiries`}>
        <ExportActions
          exportLabel="Export"
          printLabel="Print"
          disableExport={loading}
          disablePrint={loading}
          onExport={async ({ from, to }) => {
            let query = supabase
              .from('enquiries')
              .select(
                `
                id,
                owner_id,
                reference,
                customer_id,
                customer_name,
                origin,
                destination,
                mode,
                cargo_type,
                weight_kg,
                volume_cbm,
                incoterm,
                status,
                expected_shipment_date,
                notes,
                assigned_customer_service_id,
                assigned_by,
                assigned_at,
                quoted_at,
                won_at,
                lost_at,
                archived_at,
                closed_by,
                created_at,
                updated_at
                `,
                { count: 'exact' }
              )
              .order('created_at', { ascending: false });
            if (search) {
              query = query.or(`reference.ilike.%${search}%,customer_name.ilike.%${search}%,origin.ilike.%${search}%,destination.ilike.%${search}%`);
            }
            if (status !== 'all') {
              query = query.eq('status', status);
            }
            if (mode !== 'all') {
              query = query.eq('mode', mode);
            }
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);
            const { data } = await query.range(0, 9999);
            const rows = (data ?? []).map((e) => ({
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
            const wb = buildWorkbook(rows, 'Enquiries');
            downloadWorkbook(wb, `enquiries_${formatDateForFile(from || 'all')}_${formatDateForFile(to || 'all')}.xlsx`);
          }}
          onPrint={async ({ from, to }) => {
            let query = supabase
              .from('enquiries')
              .select(
                `
                id,
                owner_id,
                reference,
                customer_id,
                customer_name,
                origin,
                destination,
                mode,
                cargo_type,
                weight_kg,
                volume_cbm,
                incoterm,
                status,
                expected_shipment_date,
                notes,
                assigned_customer_service_id,
                assigned_by,
                assigned_at,
                quoted_at,
                won_at,
                lost_at,
                archived_at,
                closed_by,
                created_at,
                updated_at
                `,
                { count: 'exact' }
              )
              .order('created_at', { ascending: false });
            if (search) {
              query = query.or(`reference.ilike.%${search}%,customer_name.ilike.%${search}%,origin.ilike.%${search}%,destination.ilike.%${search}%`);
            }
            if (status !== 'all') {
              query = query.eq('status', status);
            }
            if (mode !== 'all') {
              query = query.eq('mode', mode);
            }
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);
            const { data } = await query.range(0, 9999);
            const tableHtml = `
              <table>
                <thead><tr><th>Ref</th><th>Customer</th><th>Route</th><th>Mode</th><th>Status</th><th>Expected</th></tr></thead>
                <tbody>
                  ${(data ?? []).map((e) => `<tr><td>${e.reference}</td><td>${e.customer_name ?? ''}</td><td>${e.origin ?? ''} → ${e.destination ?? ''}</td><td>${e.mode}</td><td>${e.status}</td><td>${e.expected_shipment_date ? new Date(e.expected_shipment_date).toLocaleDateString() : ''}</td></tr>`).join('')}
                </tbody>
              </table>`;
            const win = openPrintWindow({ title: 'Enquiries', subtitle: `From ${from || 'start'} to ${to || 'now'}`, tableHtml });
            win?.print();
          }}
        />
        <Button size="sm" className="gap-1.5">
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
              {showSkeleton ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : enquiries.length === 0 ? (
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
                    <TableRow key={e.id} className="cursor-pointer hover:bg-muted/40">
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

        {enquiries.length > 0 && (
          <TablePagination
            currentPage={page}
            totalPages={totalPagesCalculated}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}