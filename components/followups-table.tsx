'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Building2,
  Flag,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  ExternalLink,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { listFollowups } from '@/lib/actions/customer-interactions/queries/list-followups';
import { completeFollowup } from '@/lib/actions/customer-interactions/mutations/complete-followup';
import { toast } from 'sonner';
import type { InteractionFollowup, FollowupFilters } from '@/lib/actions/customer-interactions/types';
import type { EmployeeOption } from '@/lib/actions/customer-interactions/queries/list-employees-for-filter';
import type { CustomerOption } from '@/lib/actions/customer-interactions/queries/list-customers-for-filter';

interface FollowupsTableProps {
  initialFollowups: InteractionFollowup[];
  initialTotal: number;
  employees: EmployeeOption[];
  customers: CustomerOption[];
}

const PAGE_SIZE = 20;

const sortFields = [
  { value: 'due_at', label: 'Due Date' },
  { value: 'followup_ref', label: 'Reference' },
  { value: 'created_at', label: 'Created' },
] as const;

const statusOptions = [
  { value: '__all__', label: 'All Status' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Overdue', label: 'Overdue' },
] as const;

function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date();
}

function StatusBadge({ status, dueAt }: { status: 'Pending' | 'Completed'; dueAt: string }) {
  const overdue = status === 'Pending' && isOverdue(dueAt);
  
  if (status === 'Completed') {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        Completed
      </Badge>
    );
  }
  
  if (overdue) {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertCircle className="h-3.5 w-3.5" />
        Overdue
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="gap-1.5">
      <Clock className="h-3.5 w-3.5 text-yellow-500" />
      Pending
    </Badge>
  );
}

export function FollowupsTable({
  initialFollowups,
  initialTotal,
  employees,
  customers,
}: FollowupsTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [followups, setFollowups] = useState<InteractionFollowup[]>(initialFollowups);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState<string>('__all__');
  const [employeeId, setEmployeeId] = useState<string>('__all__');
  const [status, setStatus] = useState<string>('__all__');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<'due_at' | 'followup_ref' | 'created_at'>('due_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(initialTotal);
  const [completingFollowupId, setCompletingFollowupId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listFollowups({
        customerId: customerId === '__all__' ? undefined : customerId,
        employeeId: employeeId === '__all__' ? undefined : employeeId,
        status: status === '__all__' ? undefined : status as 'Pending' | 'Completed',
        dueFrom: dateFrom || undefined,
        dueTo: dateTo || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      if (!result.success) {
        setError(result.error);
        setFollowups([]);
        setTotal(0);
      } else {
        setFollowups(result.followups);
        setTotal(result.total);
      }
    } catch (err) {
      setError('Failed to fetch follow-ups');
      setFollowups([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [customerId, employeeId, status, dateFrom, dateTo, page]);

  useEffect(() => {
    const t = setTimeout(fetchFollowups, 200);
    return () => clearTimeout(t);
  }, [fetchFollowups]);

  useEffect(() => {
    setPage(0);
  }, [search, customerId, employeeId, status, dateFrom, dateTo]);

  const toggleSort = (field: 'due_at' | 'followup_ref' | 'created_at') => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
    setCustomerId('__all__');
    setEmployeeId('__all__');
    setStatus('__all__');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = search || customerId !== '__all__' || employeeId !== '__all__' || status !== '__all__' || dateFrom || dateTo;

  const handleCompleteFollowup = async (followupId: string) => {
    if (!completionNotes.trim()) {
      toast.error('Completion notes are required');
      return;
    }
    setCompletingFollowupId(followupId);
    try {
      const result = await completeFollowup({
        followupId,
        completionNotes: completionNotes.trim(),
      });
      if (result.success) {
        toast.success('Follow-up completed');
        router.refresh();
        setCompletingFollowupId(null);
        setCompletionNotes('');
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to complete follow-up');
    } finally {
      setCompletingFollowupId(null);
    }
  };

  const handleOpenCompleteDialog = (followupId: string) => {
    setCompletingFollowupId(followupId);
    setCompletionNotes('');
  };

  const handleViewInteraction = (interactionRef: string) => {
    router.push(`/customer-interactions/${interactionRef}`);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Follow-ups"
        description={`${total} follow-ups in your workspace`}
      >
        <Button variant="outline" size="sm" className="gap-1.5" disabled={loading}>
          <Flag className="h-4 w-4" /> Export
        </Button>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reference, subject, customer…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-9 w-[200px]">
                <Building2 className="mr-2 h-3.5 w-3.5" />
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
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[160px]">
                <Flag className="mr-2 h-3.5 w-3.5" />
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
            <Select value={sortBy} onValueChange={(v: 'due_at' | 'followup_ref' | 'created_at') => { setSortBy(v); setSortDir('asc'); }}>
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
                  onClick={() => toggleSort('followup_ref')}
                >
                  <div className="flex items-center gap-1">
                    Reference
                    {sortBy === 'followup_ref' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('due_at')}
                >
                  <div className="flex items-center gap-1">
                    Due Date/Time
                    {sortBy === 'due_at' && (
                      <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Interaction Reference</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Assigned Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && followups.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : followups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <Flag className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-base font-semibold">No follow-ups found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {hasFilters
                          ? 'Try adjusting your filters or search.'
                          : 'No follow-ups in your workspace.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                followups.map((followup) => {
                  const overdue = followup.status === 'Pending' && isOverdue(followup.dueAt);
                  return (
                    <TableRow
                      key={followup.id}
                      className={`cursor-pointer hover:bg-muted/40 transition-colors ${overdue ? 'bg-destructive/5' : ''}`}
                      onClick={() => handleViewInteraction(followup.interactionRef)}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {followup.followupRef}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{followup.companyName || followup.customerRef || followup.customerId}</div>
                        <div className="text-xs text-muted-foreground font-mono">{followup.customerRef}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(followup.dueAt).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {overdue && <span className="ml-2 text-destructive font-medium">(OVERDUE)</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {followup.interactionRef || '—'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {followup.subject || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {employees.find(e => e.id === followup.employeeId)?.fullName ?? followup.employeeId}
                        {employees.find(e => e.id === followup.employeeId)?.employeeCode && (
                          <span className="text-muted-foreground ml-1">({employees.find(e => e.id === followup.employeeId)?.employeeCode})</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={followup.status} dueAt={followup.dueAt} />
                      </TableCell>
                      <TableCell className="text-right">
                        {followup.status === 'Pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCompleteDialog(followup.id);
                            }}
                            disabled={completingFollowupId === followup.id}
                          >
                            {completingFollowupId === followup.id ? (
                              <Clock className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
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

      {/* Complete Follow-up Dialog */}
      <CompleteFollowupDialog
        open={completingFollowupId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCompletingFollowupId(null);
            setCompletionNotes('');
          }
        }}
        followupId={completingFollowupId}
        completionNotes={completionNotes}
        setCompletionNotes={setCompletionNotes}
        onComplete={handleCompleteFollowup}
      />
    </div>
  );
}

function CompleteFollowupDialog({
  open,
  onOpenChange,
  followupId,
  completionNotes,
  setCompletionNotes,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followupId: string | null;
  completionNotes: string;
  setCompletionNotes: (notes: string) => void;
  onComplete: (followupId: string) => void;
}) {
  if (!open || !followupId) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Follow-up</DialogTitle>
          <DialogDescription>
            Enter completion notes for this follow-up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="completionNotes">Completion Notes <span className="text-destructive">*</span></Label>
            <Textarea
              id="completionNotes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              className="min-h-[100px] resize-y"
              placeholder="Describe what was discussed, outcome, and next steps..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onComplete(followupId)}
            disabled={!completionNotes.trim()}
          >
            Complete Follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}