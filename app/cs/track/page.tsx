'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  PackageSearch,
  Download,
  Calendar,
  Building2,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackingTable } from '@/components/cs/tracking-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useCs } from '@/lib/cs-store';
import { downloadCsv } from '@/lib/csv';

type FilterTab = 'active' | 'all';

function TrackPageInner() {
  const { shipments, loading, company } = useCs();
  const params = useSearchParams();
  const [filterTab, setFilterTab] = React.useState<FilterTab>('active');
  const urlQuery = params.get('q') ?? '';
  const [trackingId, setTrackingId] = React.useState(urlQuery);
  const [searched, setSearched] = React.useState(!!urlQuery.trim());

  // Header search navigates here with ?q=...
  React.useEffect(() => {
    if (urlQuery.trim()) {
      setTrackingId(urlQuery);
      setSearched(true);
      setFilterTab('all');
    }
  }, [urlQuery]);

  const recentJobs = React.useMemo(() => shipments.slice(0, 3).map((s) => s.jobNo).filter(Boolean), [shipments]);

  const handleSearch = () => {
    if (trackingId.trim()) setSearched(true);
  };

  const matchedShipments = React.useMemo(() => {
    if (!searched) return [];
    const q = trackingId.trim().toLowerCase();
    return shipments.filter(
      (s) =>
        s.jobNo.toLowerCase().includes(q) ||
        s.hbl.toLowerCase().includes(q) ||
        s.mbl.toLowerCase().includes(q) ||
        s.invoiceNo.toLowerCase().includes(q) ||
        s.containerNos.toLowerCase().includes(q) ||
        s.sbillOrBoeNo.toLowerCase().includes(q) ||
        s.shipper.toLowerCase().includes(q) ||
        s.consignee.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q)
    );
  }, [searched, trackingId, shipments]);

  const displayedShipments = React.useMemo(() => {
    if (filterTab === 'active') return matchedShipments.filter((s) => s.status === 'Active');
    return matchedShipments;
  }, [matchedShipments, filterTab]);

  const activeCount = matchedShipments.filter((s) => s.status === 'Active').length;
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleDownloadCsv = () => {
    if (displayedShipments.length === 0) return;
    const safe = (trackingId.trim() || 'all').replace(/[^\w.-]+/g, '_');
    downloadCsv(
      `DSR_${safe}_${new Date().toLocaleDateString('en-CA')}.csv`,
      [
        'Job No', 'Date', 'Invoice No', 'Shipper', 'Consignee', 'Mode', 'Carrier', 'POL', 'POD',
        'Container Nos', 'HBL', 'MBL', 'S/Bill or BOE No', 'S/Bill or BOE Date', 'LEO Date', 'ETD', 'ETA',
        'Handover', 'Delivery', 'BL Type', 'Services', 'Packages', 'Gross Weight', 'Weight Unit',
        'Latest Remark', 'Remark Date', 'Status', 'Milestone',
      ],
      displayedShipments.map((s) => [
        s.jobNo, s.date, s.invoiceNo, s.shipper, s.consignee, s.mode, s.carrier, s.pol, s.pod,
        s.containerNos, s.hbl, s.mbl, s.sbillOrBoeNo, s.sbillOrBoeDate, s.leoDate, s.etd, s.eta,
        s.handoverDate, s.deliveryDate, s.blType, s.services, s.packages, s.grossWeight, s.weightUnit,
        s.remark, s.remarkDate, s.status, s.milestone,
      ])
    );
  };

  return (
    <div className="space-y-5">
      {/* Search Hero Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-500 px-6 py-8 sm:px-10 sm:py-10">
          <div className="absolute right-6 top-6 opacity-10">
            <PackageSearch className="h-32 w-32 text-white" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">
              Track Your Shipments
            </h2>
            <p className="mt-1.5 text-sm text-blue-100">
              Enter a Job Number, HBL, MBL, Invoice or Container number to view live shipment status
            </p>
            <div className="mt-5 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Job No, HBL, MBL, Invoice No or Container No"
                  className="h-12 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-300/50"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="h-12 bg-white px-6 font-semibold text-blue-700 shadow-lg hover:bg-blue-50"
              >
                Track Now
              </Button>
            </div>
            {recentJobs.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-blue-100">Recent jobs:</span>
                {recentJobs.map((sample) => (
                  <button
                    key={sample}
                    onClick={() => {
                      setTrackingId(sample);
                      setSearched(true);
                    }}
                    className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-50 backdrop-blur-sm transition hover:bg-white/25"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DSR View */}
      {searched && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Welcome Banner */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  {company?.name ? `${company.name} — ` : ''}Daily Status Report
                </h3>
                <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {today}
                </div>
              </div>
            </div>
            <Button
              onClick={handleDownloadCsv}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between">
            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
              <TabsList className="h-10 bg-slate-100 p-1">
                <TabsTrigger value="active" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Truck className="h-4 w-4" />
                  Active Shipments
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                    {activeCount}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  All Shipments
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {matchedShipments.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Tracking Table */}
          {loading ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : displayedShipments.length > 0 ? (
            <TrackingTable shipments={displayedShipments} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <PackageSearch className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-heading text-sm font-semibold text-slate-700">
                No shipments found for &quot;{trackingId}&quot;
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different Job Number, HBL, MBL, Invoice or Container number.
              </p>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <PackageSearch className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-heading text-lg font-bold text-slate-900">
            Enter a job or tracking number to begin
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Search by Job Number, HBL, MBL, Invoice or Container Number to view the full DSR with milestone tracking.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <React.Suspense fallback={null}>
      <TrackPageInner />
    </React.Suspense>
  );
}
