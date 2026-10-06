'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCs } from '@/lib/cs-store';
import type { Enquiry, EnquiryStatus } from '@/lib/types';
import { EnquiriesTable } from '@/components/cs/enquiries-table';
import { NewEnquiryModal } from '@/components/cs/new-enquiry-modal';
import { QuotationPanel } from '@/components/cs/quotation-panel';
import { CancelEnquiryDialog } from '@/components/cs/cancel-enquiry-dialog';

type Filter = 'All' | EnquiryStatus;

function EnquiriesPageInner() {
  const { enquiries, cancelEnquiry, loading } = useCs();
  const { toast } = useToast();
  const params = useSearchParams();
  const urlQuery = params.get('q') ?? '';

  const [filter, setFilter] = React.useState<Filter>('All');
  const [search, setSearch] = React.useState(urlQuery);
  const [newOpen, setNewOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Enquiry | null>(null);
  const [quotationId, setQuotationId] = React.useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<Enquiry | null>(null);

  // Header search navigates here with ?q=...
  React.useEffect(() => {
    setSearch(urlQuery);
    if (urlQuery) setFilter('All');
  }, [urlQuery]);

  // Always show the live copy so the panel reflects refreshed data.
  const quotationEnquiry = quotationId ? enquiries.find((e) => e.id === quotationId) ?? null : null;

  const filtered = React.useMemo(() => {
    let list = enquiries;
    if (filter !== 'All') list = list.filter((e) => e.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.enquiryNo.toLowerCase().includes(q) ||
          e.customerName.toLowerCase().includes(q) ||
          e.salesPerson.toLowerCase().includes(q) ||
          e.commodity.toLowerCase().includes(q) ||
          e.shipper.toLowerCase().includes(q) ||
          e.consignee.toLowerCase().includes(q) ||
          (e.linkedJobNo ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [enquiries, filter, search]);

  const counts = React.useMemo(
    () => ({
      All: enquiries.length,
      Pending: enquiries.filter((e) => e.status === 'Pending').length,
      Confirmed: enquiries.filter((e) => e.status === 'Confirmed').length,
      Cancelled: enquiries.filter((e) => e.status === 'Cancelled').length,
    }),
    [enquiries]
  );

  const handleCancelConfirm = async (remark: string) => {
    if (!cancelTarget) return;
    await cancelEnquiry(cancelTarget.id, remark);
    toast({ title: 'Enquiry cancelled', description: `${cancelTarget.enquiryNo} was cancelled.` });
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: 'All', label: 'All' },
    { key: 'Pending', label: 'Pending' },
    { key: 'Confirmed', label: 'Confirmed' },
    { key: 'Cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">All Enquiries</h2>
            <p className="text-sm text-slate-500">Manage freight enquiries, quotations, and job confirmations</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            <ClipboardList className="h-3.5 w-3.5" />
            CS Module
          </span>
        </div>
        <Button onClick={() => setNewOpen(true)} className="h-10 gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          New Enquiry
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="h-10 bg-slate-100 p-1">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                {t.label}
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                  {counts[t.key]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search enquiries..."
            className="border-slate-200 bg-white pl-9"
          />
        </div>
      </div>

      <EnquiriesTable
        enquiries={filtered}
        loading={loading}
        onViewQuotation={(e) => setQuotationId(e.id)}
        onEdit={(e) => setEditTarget(e)}
        onCancel={(e) => setCancelTarget(e)}
      />

      <NewEnquiryModal open={newOpen} onOpenChange={setNewOpen} />
      <NewEnquiryModal
        open={!!editTarget}
        enquiry={editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      />
      <QuotationPanel
        enquiry={quotationEnquiry}
        open={!!quotationEnquiry}
        onOpenChange={(open) => !open && setQuotationId(null)}
      />
      <CancelEnquiryDialog
        enquiry={cancelTarget}
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}

export default function EnquiriesPage() {
  return (
    <React.Suspense fallback={null}>
      <EnquiriesPageInner />
    </React.Suspense>
  );
}
