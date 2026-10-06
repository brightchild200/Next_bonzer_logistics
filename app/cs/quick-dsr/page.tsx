'use client';

import * as React from 'react';
import { FileText, Zap, Package, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { QuickDsrTable } from '@/components/cs/quick-dsr-table';
import { useCs } from '@/lib/cs-store';

export default function QuickDsrPage() {
  const { shipments } = useCs();
  const [search, setSearch] = React.useState('');
  const activeCount = shipments.filter((s) => s.status === 'Active').length;

  return (
    <div className="space-y-5">
      {/* Page header with active jobs count card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">
            Quick DSR Update
          </h2>
          <p className="text-sm text-slate-500">
            Instantly update daily status remarks for active operational jobs
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="leading-tight">
              <p className="font-heading text-xl font-bold text-slate-900">{activeCount}</p>
              <p className="text-xs text-slate-500">Active Jobs</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div className="leading-tight">
              <p className="font-heading text-xl font-bold text-slate-900">Auto</p>
              <p className="text-xs text-slate-500">Save Mode</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-sm text-blue-700">
        <FileText className="h-4 w-4 shrink-0" />
        <span>
          Remarks save to the database automatically when you pause typing or leave the box. Watch the status on each row — failures show a retry link.
        </span>
      </div>

      <div className="relative sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search job, shipper, consignee..."
          className="border-slate-200 bg-white pl-9"
        />
      </div>

      <QuickDsrTable search={search} />
    </div>
  );
}
