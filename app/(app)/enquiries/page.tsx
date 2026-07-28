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
  X,
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
  TablePagination,
  TableEmptyState,
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
    const detailId = searchParams.get('detail');
    if (!detailId) {
      return;
    }

    supabase
      .from('enquiries')
      .select('*')
      .eq('id', detailId)
      .single()
      .then(({ data }) => {
        if (data) {
          setDetailEnquiry(data as Enquiry);
          setDetailOpen(true);
        }
      });
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

  const activeFilters = [
    statusFilter !== 'all' && { key: 'status', value: statusFilter, label: statusOptions.find(s => s.value === statusFilter)?.label },
    modeFilter !== 'all' && { key: 'mode', value: modeFilter, label: modeOptions.find(m => m.value === modeFilter)?.label },
  ].filter(Boolean) as { key: string; value: string; label: string }[];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Enquiries"
        description={`${total} enquiries in your workspace`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Enquiries', isCurrent: true },
        ]}
      >
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleNew}>
            <Plus className="h-4 w-4" /> New Enquiry
          </Button>
        </div>
      </PageHeader>

      {/* Search & Filters */}
      <Card className="mb-4">
        <div className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by reference, customer, origin, destination…"
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
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
                <SelectTrigger className="h-10 w-[130px]">
                  <SelectValue placeholder="Mode" />
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
                <SelectTrigger className="h-10 w-[150px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
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
                className="h-10 w-10"
                onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                aria-label={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
              >
                <ArrowUpDown className={cn('h-4 w-4 transition-transform', sortDir === 'asc' && 'rotate-180')} />
              </Button>
            </div>
          </div>

          {/* Active Filter Badges */}
          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.key}
                  variant="secondary"
                  className="gap-1"
                  onClick={() => {
                    if (filter.key === 'status') setStatusFilter('all');
                    if (filter.key === 'mode') setModeFilter('all');
                  }}
                >
                  {filter.label}
                  <X className="h-3 w-3 cursor-pointer hover:opacity-70" />
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setModeFilter('all'); }}>
                Clear all
              </Button>
            </div>
          )}

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
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table stickyHeader>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.size === enquiries.length && enquiries.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('reference')}
                  sortable
                >
                  Reference
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('customer_name')}
                  sortable
                >
                  Customer
                </TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('status')}
                  sortable
                >
                  Status
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('created_at')}
                  sortable
                >
                  Created
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
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
                  ))}
                </>
              ) : enquiries.length === 0 ? (
                <TableEmptyState
                  colSpan={8}
                  icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
                  title="No enquiries found"
                  description={
                    search || statusFilter !== 'all' || modeFilter !== 'all'
                      ? 'Try adjusting your filters or search.'
                      : 'Create your first enquiry to get started.'
                  }
                  action={
                    <Button className="gap-1.5" onClick={handleNew}>
                      <Plus className="h-4 w-4" /> New Enquiry
                    </Button>
                  }
                />
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
                      selected={isSelected}
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
                        <StatusBadge status={e.status} size="md" />
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
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            showPageSize
            pageSizeOptions={[10, 25, 50, 100]}
            onPageSizeChange={(size) => { /* handle page size change */ }}
          />
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
