'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Download, Package, Plane, Ship, Truck, Train } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
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
import type { Shipment } from '@/lib/supabase';

const modeIcons: Record<string, typeof Plane> = {
  air: Plane,
  sea: Ship,
  road: Truck,
  rail: Train,
};

const PAGE_SIZE = 10;

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchShipments = async () => {
      setLoading(true);
      let query = supabase
        .from('shipments')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (search) {
        query = query.or(`reference.ilike.%${search}%,customer_name.ilike.%${search}%,origin.ilike.%${search}%,destination.ilike.%${search}%`);
      }
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      const { data, count, error } = await query;
      if (error) {
        console.error(error);
      } else {
        setShipments(data ?? []);
        setTotal(count ?? 0);
      }
      setLoading(false);
    };
    fetchShipments();
  }, [search, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showSkeleton = loading && shipments.length === 0;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Shipments" description={`${total} shipments`}>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" /> Export
        </Button>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Shipment
        </Button>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shipments…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table stickyHeader>
            <TableHeader sticky>
              <TableRow className="hover:bg-transparent">
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead className="text-right">Value</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-base font-semibold">No shipments yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Book your first shipment to start tracking.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map((s) => {
                  const ModeIcon = modeIcons[s.mode] ?? Ship;
                  return (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-medium">{s.reference}</TableCell>
                      <TableCell className="font-medium">{s.customer_name ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span>{s.origin ?? '—'}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{s.destination ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs capitalize">{s.mode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.carrier ?? '—'}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.eta ? new Date(s.eta).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {s.currency} {s.value.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {shipments.length > 0 && (
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
