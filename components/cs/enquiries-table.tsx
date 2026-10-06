'use client';

import * as React from 'react';
import { MoreHorizontal, Check, X, Eye, Pencil, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusBadge, ModePill, JobBadge } from './badges';
import { useToast } from '@/hooks/use-toast';
import { useCs } from '@/lib/cs-store';
import { errorMessage } from '@/lib/supabase/queries';
import { downloadCsv } from '@/lib/csv';
import { chargeAmountInr } from '@/lib/charges';
import { formatDate } from '@/lib/date';
import type { Enquiry } from '@/lib/types';

interface Props {
  enquiries: Enquiry[];
  loading?: boolean;
  onViewQuotation: (enquiry: Enquiry) => void;
  onEdit: (enquiry: Enquiry) => void;
  onCancel: (enquiry: Enquiry) => void;
}

function exportEnquiryCsv(enquiry: Enquiry) {
  downloadCsv(
    `${enquiry.enquiryNo === 'Draft' ? `enquiry-${enquiry.id}` : enquiry.enquiryNo}_charges.csv`,
    ['Description', 'Quantity', 'Rate', 'Currency', 'Exchange Rate', 'Amount (INR)'],
    enquiry.charges.map((ch) => [
      ch.description,
      ch.quantity,
      ch.rate,
      ch.currency,
      ch.exchangeRate.toFixed(2),
      chargeAmountInr(ch).toFixed(2),
    ])
  );
}

export function EnquiriesTable({ enquiries, loading, onViewQuotation, onEdit, onCancel }: Props) {
  const { confirmEnquiry } = useCs();
  const { toast } = useToast();
  const [confirmTarget, setConfirmTarget] = React.useState<Enquiry | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  const runConfirm = async () => {
    const enquiry = confirmTarget;
    if (!enquiry) return;
    setConfirmTarget(null);
    setConfirmingId(enquiry.id);
    try {
      const { enquiryNo, jobNo } = await confirmEnquiry(enquiry.id);
      toast({ title: 'Enquiry confirmed', description: `${enquiryNo} → job ${jobNo} created.` });
    } catch (err) {
      toast({ title: 'Could not confirm enquiry', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setConfirmingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (enquiries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <FileSpreadsheet className="h-6 w-6 text-slate-400" />
        </div>
        <p className="font-heading text-sm font-semibold text-slate-700">No enquiries found</p>
        <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters, or create a new enquiry.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {['Date', 'Enquiry No', 'Customer', 'Mode', 'Sales Person', 'Status', 'Linked Job'].map((h) => (
                  <TableHead key={h} className="font-semibold text-slate-600">{h}</TableHead>
                ))}
                <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enquiries.map((enquiry) => {
                const busy = confirmingId === enquiry.id;
                return (
                  <TableRow key={enquiry.id} className="group border-slate-100 hover:bg-blue-50/30">
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">{formatDate(enquiry.date)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          enquiry.enquiryNo === 'Draft'
                            ? 'font-mono text-sm italic text-slate-400'
                            : 'font-mono text-sm font-semibold text-slate-800'
                        }
                      >
                        {enquiry.enquiryNo}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">{enquiry.customerName}</TableCell>
                    <TableCell>{enquiry.mode ? <ModePill mode={enquiry.mode} /> : <span className="text-xs text-slate-400">—</span>}</TableCell>
                    <TableCell className="text-sm text-slate-600">{enquiry.salesPerson}</TableCell>
                    <TableCell>
                      <StatusBadge status={enquiry.status} />
                    </TableCell>
                    <TableCell>
                      {enquiry.linkedJobNo ? <JobBadge jobNo={enquiry.linkedJobNo} /> : <span className="text-xs text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {enquiry.status === 'Pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => setConfirmTarget(enquiry)}
                              className="h-8 gap-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              <span className="hidden sm:inline">Confirm</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => onCancel(enquiry)}
                              className="h-8 gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <X className="h-4 w-4" />
                              <span className="hidden lg:inline">Cancel</span>
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="More actions"
                              className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => onViewQuotation(enquiry)}>
                              <Eye className="mr-2 h-4 w-4 text-slate-500" />
                              View Quotation
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={enquiry.status !== 'Pending'} onClick={() => onEdit(enquiry)}>
                              <Pencil className="mr-2 h-4 w-4 text-slate-500" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => exportEnquiryCsv(enquiry)}>
                              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                              Export CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.customerName} — {confirmTarget?.polPort} → {confirmTarget?.podPort}. This assigns an enquiry
              number and creates an operational job. You won&apos;t be able to edit the enquiry afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirm} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm &amp; create job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
