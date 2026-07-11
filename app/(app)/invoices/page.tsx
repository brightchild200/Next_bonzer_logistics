'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Download, FileBarChart } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import type { Invoice } from '@/lib/supabase';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (search) {
      query = query.or(`reference.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }
    query.then(({ data }) => {
      setInvoices(data ?? []);
      setLoading(false);
    });
  }, [search]);

  const totalAmount = invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const paidAmount = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0);
  const overdueAmount = invoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Invoices" description={`${invoices.length} invoices`}>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" /> Export
        </Button>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Invoice
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Billed', value: `$${totalAmount.toLocaleString()}`, color: 'text-foreground' },
          { label: 'Collected', value: `$${paidAmount.toLocaleString()}`, color: 'text-success' },
          { label: 'Overdue', value: `$${overdueAmount.toLocaleString()}`, color: 'text-destructive' },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                        <FileBarChart className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-base font-semibold">No invoices yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Create invoices to track billing and payments.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/40">
                    <TableCell className="font-mono text-xs font-medium">{inv.reference}</TableCell>
                    <TableCell className="font-medium">{inv.customer_name ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {inv.currency} {inv.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
