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
  Calendar,
  User,
  MessageSquare,
  Flag,
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
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ExportActions } from '@/components/export-actions';
import { buildWorkbook, downloadWorkbook, formatDateForFile, openPrintWindow } from '@/lib/export-utils';
import { listInteractions } from '@/lib/actions/customer-interactions/queries/list-interactions';
import type { CustomerInteraction } from '@/lib/actions/customer-interactions/types';
import type { InteractionType, InteractionOutcome } from '@/lib/actions/customer-interactions/types';

interface InteractionFilters {
  customerId?: string;
  employeeId?: string;
  interactionTypeId?: string;
  interactionOutcomeId?: string;
  enquiryId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

const PAGE_SIZE = 10;

const sortFields = [
  { value: 'interaction_at', label: 'Date' },
  { value: 'interaction_ref', label: 'Reference' },
  { value: 'created_at', label: 'Created' },
] as const;

interface CustomerOption {
  id: string;
  customerRef: string;
  companyName: string;
  city: string | null;
  state: string | null;
}

interface CustomerInteractionsTableProps {
  initialInteractions: CustomerInteraction[];
  initialTotal: number;
  interactionTypes: InteractionType[];
  interactionOutcomes: InteractionOutcome[];
  employees: { id: string; fullName: string; employeeCode: string | null }[];
  customers: CustomerOption[];
}

function buildInteractionsTableHtml(rows: CustomerInteraction[]) {
  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${row.interactionRef}</td>
          <td>${row.companyName || row.customerRef || row.customerId}</td>
          <td>${new Date(row.interactionAt).toLocaleDateString()}</td>
          <td>${row.subject ?? ''}</td>
          <td>${row.interactionChannel}</td>
          <td>${row.isActive ? 'Active' : 'Inactive'}</td>
        </tr>`
    )
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Reference</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Subject</th>
          <th>Channel</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

export function CustomerInteractionsTable({
  initialInteractions,
  initialTotal,
  interactionTypes,
  interactionOutcomes,
  employees,
  customers,
}: CustomerInteractionsTableProps) {
  const searchParams = useSearchParams();
  const [interactions, setInteractions] = useState<CustomerInteraction[]>(initialInteractions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState<string>('__all__');
  const [employeeId, setEmployeeId] = useState<string>('__all__');
  const [interactionTypeId, setInteractionTypeId] = useState<string>('__all__');
  const [interactionOutcomeId, setInteractionOutcomeId] = useState<string>('__all__');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'interaction_at' | 'interaction_ref' | 'created_at'>('interaction_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(initialTotal);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listInteractions({
        customerId: customerId === '__all__' ? undefined : customerId,
        employeeId: employeeId === '__all__' ? undefined : employeeId,
        interactionTypeId: interactionTypeId === '__all__' ? undefined : interactionTypeId,
        interactionOutcomeId: interactionOutcomeId === '__all__' ? undefined : interactionOutcomeId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        isActive,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      if (!result.success) {
        setError(result.error);
        setInteractions([]);
        setTotal(0);
      } else {
        setInteractions(result.interactions);
        setTotal(result.total);
      }
    } catch (err) {
      setError('Failed to fetch interactions');
      setInteractions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    customerId,
    employeeId,
    interactionTypeId,
    interactionOutcomeId,
    dateFrom,
    dateTo,
    isActive,
    search,
    page,
  ]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      window.location.href = '/customer-interactions/new';
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(fetchInteractions, 200);
    return () => clearTimeout(t);
  }, [fetchInteractions]);

  useEffect(() => {
    setPage(0);
  }, [search, customerId, employeeId, interactionTypeId, interactionOutcomeId, dateFrom, dateTo, isActive]);

  const toggleSort = (field: 'interaction_at' | 'interaction_ref' | 'created_at') => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
    setCustomerId('__all__');
    setEmployeeId('__all__');
    setInteractionTypeId('__all__');
    setInteractionOutcomeId('__all__');
    setDateFrom('');
    setDateTo('');
    setIsActive(undefined);
  };

  const hasFilters = search || customerId !== '__all__' || employeeId !== '__all__' || interactionTypeId !== '__all__' || interactionOutcomeId !== '__all__' || dateFrom || dateTo || isActive !== undefined;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Customer Interactions"
        description={`${total} interactions in your workspace`}
      >
        <ExportActions
          exportLabel="Export"
          printLabel="Print"
          disableExport={loading}
          disablePrint={loading}
          onExport={async ({ from, to }) => {
            const result = await listInteractions({
              customerId: customerId === '__all__' ? undefined : customerId,
              employeeId: employeeId === '__all__' ? undefined : employeeId,
              interactionTypeId: interactionTypeId === '__all__' ? undefined : interactionTypeId,
              interactionOutcomeId: interactionOutcomeId === '__all__' ? undefined : interactionOutcomeId,
              dateFrom: from || dateFrom || undefined,
              dateTo: to || dateTo || undefined,
              isActive,
              search: search || undefined,
              limit: 1000,
              offset: 0,
            });
            if (!result.success) return;
            const rows = result.interactions.map((row) => ({
              Reference: row.interactionRef,
              Customer: row.companyName || row.customerRef || row.customerId,
              Date: row.interactionAt,
              Subject: row.subject ?? '',
              Channel: row.interactionChannel,
              Status: row.isActive ? 'Active' : 'Inactive',
            }));
            const workbook = buildWorkbook(rows, 'Interactions');
            downloadWorkbook(workbook, `interactions_${formatDateForFile(from || dateFrom || 'all')}_${formatDateForFile(to || dateTo || 'all')}.xlsx`);
          }}
          onPrint={async ({ from, to }) => {
            const result = await listInteractions({
              customerId: customerId === '__all__' ? undefined : customerId,
              employeeId: employeeId === '__all__' ? undefined : employeeId,
              interactionTypeId: interactionTypeId === '__all__' ? undefined : interactionTypeId,
              interactionOutcomeId: interactionOutcomeId === '__all__' ? undefined : interactionOutcomeId,
              dateFrom: from || dateFrom || undefined,
              dateTo: to || dateTo || undefined,
              isActive,
              search: search || undefined,
              limit: 1000,
              offset: 0,
            });
            if (!result.success) return;
            const win = openPrintWindow({
              title: 'Customer Interactions',
              subtitle: `From ${from || dateFrom || 'start'} to ${to || dateTo || 'now'}`,
              tableHtml: buildInteractionsTableHtml(result.interactions),
            });
            win?.print();
          }}
        />
        <Button size="sm" className="gap-1.5" onClick={() => window.location.href = '/customer-interactions/new'}>
          <Plus className="h-4 w-4" /> New Interaction
        </Button>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reference, subject, notes…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-9 w-[200px]">
                <User className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.companyName} ({c.customerRef})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-9 w-[200px]">
                <User className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={interactionTypeId} onValueChange={setInteractionTypeId}>
              <SelectTrigger className="h-9 w-[180px]">
                <MessageSquare className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {interactionTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={interactionOutcomeId} onValueChange={setInteractionOutcomeId}>
              <SelectTrigger className="h-9 w-[180px]">
                <Flag className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Outcomes</SelectItem>
                {interactionOutcomes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                className="w-[140px]"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
                disabled={loading}
              />
              <Input
                type="date"
                className="w-[140px]"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
                disabled={loading}
              />
            </div>
            <Select value={isActive === undefined ? 'all' : isActive.toString()} onValueChange={(v) => setIsActive(v === 'all' ? undefined : v === 'true')}>
              <SelectTrigger className="h-9 w-[120px]">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v: 'interaction_at' | 'interaction_ref' | 'created_at') => { setSortBy(v); setSortDir('desc'); }}>
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
              <ArrowUpDown className={cn('h-4 w-4', sortDir === 'asc' && 'rotate-180')} />
            </Button>
          </div>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </Card>

      {error && (
        <Card className="mb-4 border-destructive">
          <div className="p-4 text-destructive">{error}</div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('interaction_ref')}
                >
                  <div className="flex items-center gap-1">
                    Reference
                    {sortBy === 'interaction_ref' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('interaction_at')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortBy === 'interaction_at' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Enquiry</TableHead>
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
              {loading && interactions.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : interactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-base font-semibold">No interactions found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {hasFilters
                          ? 'Try adjusting your filters or search.'
                          : 'Create your first interaction to get started.'}
                      </p>
                      <Button className="mt-4 gap-1.5" onClick={() => window.location.href = '/customer-interactions/new'}>
                        <Plus className="h-4 w-4" /> New Interaction
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                interactions.map((interaction) => (
                  <TableRow
                    key={interaction.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => window.location.href = `/customer-interactions/${interaction.interactionRef}`}
                  >
                    <TableCell className="font-mono text-xs font-medium">
                      {interaction.interactionRef}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{interaction.companyName || interaction.customerRef || interaction.customerId}</div>
                      <div className="text-xs text-muted-foreground font-mono">{interaction.customerRef}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(interaction.interactionAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {interactionTypes.find(t => t.id === interaction.interactionTypeId)?.name ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {interactionOutcomes.find(o => o.id === interaction.interactionOutcomeId)?.name ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {employees.find(e => e.id === interaction.employeeId)?.fullName ?? interaction.employeeId}
                      {employees.find(e => e.id === interaction.employeeId)?.employeeCode && (
                        <span className="text-muted-foreground ml-1">({employees.find(e => e.id === interaction.employeeId)?.employeeCode})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {interaction.enquiryId ? (
                        <Badge variant="default">Linked</Badge>
                      ) : (
                        <Badge variant="secondary">—</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(interaction.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/customer-interactions/${interaction.interactionRef}`;
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {total > PAGE_SIZE && (
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
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(page + 1)}
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
