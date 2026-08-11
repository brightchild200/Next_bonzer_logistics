'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Download,
  Eye,
  Edit,
  X,
  FileText,
  Building2,
  Users,
  AlertCircle,
  Loader2,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { KycDetailDialog } from '@/components/kyc-detail-dialog';
import { listKycRecords } from '@/lib/actions/kyc/list-kyc';
import { updateKycStatus } from '@/lib/actions/kyc/update-kyc-status';
import type { KycRecord, KycStatusFilter } from '@/lib/actions/kyc/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusOptions: { value: KycStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const sortFields = [
  { value: 'updated_at', label: 'Last Updated' },
  { value: 'company_name', label: 'Customer Name' },
  { value: 'customer_ref', label: 'Reference' },
  { value: 'kyc_status', label: 'KYC Status' },
  { value: 'created_at', label: 'Date Created' },
];

const PAGE_SIZE = 20;

export default function KycPage() {
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>('all');
  const [sortBy, setSortBy] = useState<keyof KycRecord>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [detailRecord, setDetailRecord] = useState<KycRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listKycRecords({
        search,
        status: statusFilter,
        page,
        pageSize: PAGE_SIZE,
        sortBy,
        sortOrder: sortDir,
      });

      if (!result.success) {
        toast.error(result.error);
        setRecords([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setRecords(result.records);
      setTotal(result.totalCount);
    } catch (err) {
      console.error('Fetch KYC records error:', err);
      toast.error('Failed to load KYC records');
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortDir, page]);

  useEffect(() => {
    const t = setTimeout(fetchRecords, 200);
    return () => clearTimeout(t);
  }, [fetchRecords]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  const toggleSort = (field: keyof KycRecord) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const handleRowClick = (record: KycRecord) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const handleKycStatusChange = async (record: KycRecord, newStatus: KycRecord['kyc_status']) => {
    if (record.kyc_status === newStatus) return;

    setUpdatingId(record.id);
    try {
      const result = await updateKycStatus({
        customer_id: record.id,
        kyc_status: newStatus,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`KYC status updated to ${newStatus}`);
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, kyc_status: newStatus, updated_at: new Date().toISOString() } : r))
      );
      if (detailRecord?.id === record.id) {
        setDetailRecord((prev) => (prev ? { ...prev, kyc_status: newStatus, updated_at: new Date().toISOString() } : null));
      }
    } catch (err) {
      console.error('Update KYC status error:', err);
      toast.error('Failed to update KYC status');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showSkeleton = loading && records.length === 0;

  const activeFilters = statusFilter !== 'all'
    ? [{
        key: 'status',
        value: statusFilter,
        label: statusOptions.find((s) => s.value === statusFilter)?.label ?? '',
      }]
    : [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="KYC Management"
        description={`${total} KYC records${statusFilter !== 'all' ? ` (${statusOptions.find(s => s.value === statusFilter)?.label})` : ''}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'KYC', isCurrent: true },
        ]}
      >
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm" className="gap-1.5" disabled={total === 0}>
            <Download className="h-4 w-4" />
            Export
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
                placeholder="Search by customer, reference, contact, email, phone…"
                className="pl-9 h-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as KycStatusFilter)}>
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
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v as keyof KycRecord); setSortDir('desc'); }}>
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
                  }}
                >
                  {filter.label}
                  <X className="h-3 w-3 cursor-pointer hover:opacity-70" />
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
                Clear all
              </Button>
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
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('company_name')}
                  sortable
                >
                  <div className="flex items-center gap-1">
                    Customer
                    {sortBy === 'company_name' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('customer_ref')}
                  sortable
                >
                  <div className="flex items-center gap-1">
                    Reference
                    {sortBy === 'customer_ref' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort('city')}>
                  <div className="flex items-center gap-1">
                    City
                    {sortBy === 'city' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => toggleSort('state')}>
                  <div className="flex items-center gap-1">
                    State
                    {sortBy === 'state' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('kyc_status')}
                  sortable
                >
                  <div className="flex items-center gap-1">
                    KYC Status
                    {sortBy === 'kyc_status' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hidden md:table-cell"
                  onClick={() => toggleSort('latest_enquiry_ref')}
                  sortable
                >
                  <div className="flex items-center gap-1">
                    Latest Enquiry
                    {sortBy === 'latest_enquiry_ref' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('updated_at')}
                  sortable
                >
                  <div className="flex items-center gap-1">
                    Last Updated
                    {sortBy === 'updated_at' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
                </>
              ) : records.length === 0 ? (
                <TableEmptyState
                  colSpan={11}
                  icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
                  title={search || statusFilter !== 'all' ? 'No matching KYC records' : 'No KYC records yet'}
                  description={
                    search || statusFilter !== 'all'
                      ? 'Try adjusting your filters or search.'
                      : 'Customers with KYC status will appear here.'
                  }
                />
              ) : (
                records.map((record) => {
                  const isUpdating = updatingId === record.id;
                  return (
                    <TableRow
                      key={record.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        'hover:bg-muted/40'
                      )}
                      onClick={() => handleRowClick(record)}
                    >
                      <TableCell className="font-medium truncate max-w-xs">{record.company_name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{record.customer_ref}</TableCell>
                      <TableCell className="hidden md:table-cell truncate max-w-xs">{record.contact_person || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell truncate max-w-xs">{record.email || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{record.phone || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell">{record.city || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{record.state || '—'}</TableCell>

                      <TableCell>
                        <StatusBadge status={record.kyc_status} size="md" />
                      </TableCell>

                      <TableHead className="hidden md:table-cell">
                        {record.latest_enquiry_ref ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="font-mono text-xs">{record.latest_enquiry_ref}</span>
                            {record.latest_enquiry_status && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                {record.latest_enquiry_status}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableHead>

                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(record.updated_at).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRowClick(record)}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {record.kyc_status !== 'verified' && (
                              <DropdownMenuItem
                                onClick={() => handleKycStatusChange(record, 'verified')}
                                disabled={isUpdating}
                              >
                                <CheckSquare className="mr-2 h-4 w-4 text-success" />
                                Mark Verified
                              </DropdownMenuItem>
                            )}
                            {record.kyc_status !== 'rejected' && (
                              <DropdownMenuItem
                                onClick={() => handleKycStatusChange(record, 'rejected')}
                                disabled={isUpdating}
                                className="text-destructive focus:text-destructive"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Mark Rejected
                              </DropdownMenuItem>
                            )}
                            {record.kyc_status !== 'submitted' && (
                              <DropdownMenuItem
                                onClick={() => handleKycStatusChange(record, 'submitted')}
                                disabled={isUpdating}
                              >
                                <FileText className="mr-2 h-4 w-4 text-info" />
                                Mark Submitted
                              </DropdownMenuItem>
                            )}
                            {record.kyc_status !== 'pending' && (
                              <DropdownMenuItem
                                onClick={() => handleKycStatusChange(record, 'pending')}
                                disabled={isUpdating}
                              >
                                <RotateCcw className="mr-2 h-4 w-4 text-warning" />
                                Mark Pending
                              </DropdownMenuItem>
                            )}
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

        {records.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages} · {total} total
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <KycDetailDialog
        record={detailRecord}
        open={detailOpen}
        setOpen={setDetailOpen}
        onStatusChange={handleKycStatusChange}
      />
    </div>
  );
}