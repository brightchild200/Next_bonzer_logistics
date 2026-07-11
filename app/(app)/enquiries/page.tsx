'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Pencil,
  Download,
  FileText,
  Inbox,
  Plane,
  Ship,
  Truck,
  Train,
  CheckSquare,
  Square,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/status-badge';
import { EnquiryForm } from '@/components/enquiry-form';
import { EnquiryDetailPanel } from '@/components/enquiry-detail-panel';
import { supabase } from '@/lib/supabase';
import type { Enquiry } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const modeIcons: Record<string, typeof Plane> = {
  air: Plane,
  sea: Ship,
  road: Truck,
  rail: Train,
};

const sortFields = [
  { value: 'created_at', label: 'Date Created' },
  { value: 'reference', label: 'Reference' },
  { value: 'customer_name', label: 'Customer' },
  { value: 'status', label: 'Status' },
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'archived', label: 'Archived' },
];

const modeOptions = [
  { value: 'all', label: 'All Modes' },
  { value: 'air', label: 'Air' },
  { value: 'sea', label: 'Sea' },
  { value: 'road', label: 'Road' },
  { value: 'rail', label: 'Rail' },
];

const PAGE_SIZE = 10;

export default function EnquiriesPage() {
  const searchParams = useSearchParams();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);
  const [detailEnquiry, setDetailEnquiry] = useState<Enquiry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('enquiries').select('*', { count: 'exact' });

    if (search) {
      query = query.or(
        `reference.ilike.%${search}%,customer_name.ilike.%${search}%,origin.ilike.%${search}%,destination.ilike.%${search}%`
      );
    }
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (modeFilter !== 'all') query = query.eq('mode', modeFilter);

    query = query.order(sortBy, { ascending: sortDir === 'asc' });
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setEnquiries(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [search, statusFilter, modeFilter, sortBy, sortDir, page]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditingEnquiry(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(fetchEnquiries, 200);
    return () => clearTimeout(t);
  }, [fetchEnquiries]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, modeFilter]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === enquiries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(enquiries.map((e) => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    const { error } = await supabase.from('enquiries').delete().in('id', ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${ids.length} enquiries deleted`);
    setSelected(new Set());
    fetchEnquiries();
  };

  const handleRowClick = (e: Enquiry) => {
    setDetailEnquiry(e);
    setDetailOpen(true);
  };

  const handleEdit = (e: Enquiry) => {
    setDetailOpen(false);
    setEditingEnquiry(e);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingEnquiry(null);
    setFormOpen(true);
  };

  const handleRowDelete = async (e: Enquiry) => {
    const { error } = await supabase.from('enquiries').delete().eq('id', e.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Enquiry deleted');
    fetchEnquiries();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showSkeleton = loading && enquiries.length === 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Enquiries"
        description={`${total} enquiries in your workspace`}
      >
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" /> Export
        </Button>
        <Button size="sm" className="gap-1.5" onClick={handleNew}>
          <Plus className="h-4 w-4" /> New Enquiry
        </Button>
      </PageHeader>

      {/* Filters bar */}
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reference, customer, origin, destination…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modeOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setSortDir('desc'); }}>
              <SelectTrigger className="h-9 w-[140px]">
                <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortFields.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 px-4 py-2 animate-slide-up">
            <span className="text-sm font-medium">
              {selected.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.size === enquiries.length && enquiries.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('reference')}
                >
                  <div className="flex items-center gap-1">
                    Reference
                    {sortBy === 'reference' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('customer_name')}
                >
                  <div className="flex items-center gap-1">
                    Customer
                    {sortBy === 'customer_name' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortBy === 'status' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortBy === 'created_at' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : enquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <Inbox className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-base font-semibold">No enquiries found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {search || statusFilter !== 'all' || modeFilter !== 'all'
                          ? 'Try adjusting your filters or search.'
                          : 'Create your first enquiry to get started.'}
                      </p>
                      <Button className="mt-4 gap-1.5" onClick={handleNew}>
                        <Plus className="h-4 w-4" /> New Enquiry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                enquiries.map((e) => {
                  const ModeIcon = modeIcons[e.mode] ?? Ship;
                  const isSelected = selected.has(e.id);
                  return (
                    <TableRow
                      key={e.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/40'
                      )}
                      onClick={() => handleRowClick(e)}
                    >
                      <TableCell onClick={(ev) => ev.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(e.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {e.reference}
                      </TableCell>
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
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(ev) => ev.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRowClick(e)}>
                              <FileText className="mr-2 h-4 w-4" /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(e)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRowDelete(e)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {enquiries.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <EnquiryForm
        open={formOpen}
        setOpen={setFormOpen}
        enquiry={editingEnquiry}
        onSaved={fetchEnquiries}
      />
      <EnquiryDetailPanel
        enquiry={detailEnquiry}
        open={detailOpen}
        setOpen={setDetailOpen}
        onEdit={handleEdit}
        onDeleted={fetchEnquiries}
      />
    </div>
  );
}
