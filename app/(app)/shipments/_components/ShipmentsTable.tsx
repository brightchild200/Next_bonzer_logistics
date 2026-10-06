import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Plane, Ship, Truck, Train } from 'lucide-react';
import type { ShipmentRow } from '@/lib/actions/shipments';

const modeIcons: Record<string, typeof Plane> = {
  air: Plane,
  sea: Ship,
  road: Truck,
  rail: Train,
};

const PAGE_SIZE = 10;

interface ShipmentsTableProps {
  shipments: ShipmentRow[];
  total: number;
  search: string;
  page: number;
}

export function ShipmentsTable({ shipments, total, search, page }: ShipmentsTableProps) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showSkeleton = shipments.length === 0 && total === 0;

  return (
    <div className="animate-fade-in">
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
                      {search ? 'No shipments match your search.' : 'Book your first shipment to start tracking.'}
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

        {shipments.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </div>
          </div>
        )}
      </div>
    </div>
  );
}