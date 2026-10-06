'use client';

import * as React from 'react';
import { AlertCircle, Check, Loader2, Pencil, RefreshCw, ClipboardCheck } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ModePill } from './badges';
import { useCs } from '@/lib/cs-store';
import { errorMessage } from '@/lib/supabase/queries';
import { formatDate, todayISO } from '@/lib/date';
import type { Shipment } from '@/lib/types';
import { cn } from '@/lib/utils';

type SaveState = 'idle' | 'typing' | 'saving' | 'saved' | 'error';

interface RowState {
  remark: string;
  remarkDate: string | null;
  saveState: SaveState;
  error?: string;
}

const DEBOUNCE_MS = 800;

function SaveIndicator({ state, error, onRetry }: { state: SaveState; error?: string; onRetry: () => void }) {
  switch (state) {
    case 'typing':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Pencil className="h-3.5 w-3.5" />
          Typing...
        </span>
      );
    case 'saving':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving...
        </span>
      );
    case 'saved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <Check className="h-3.5 w-3.5" />
          Saved
        </span>
      );
    case 'error':
      return (
        <button
          onClick={onRetry}
          title={error}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Failed — retry
          <RefreshCw className="h-3 w-3" />
        </button>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <Check className="h-3.5 w-3.5 text-slate-300" />
          Synced
        </span>
      );
  }
}

export function QuickDsrTable({ search = '' }: { search?: string }) {
  const { shipments, updateShipmentRemark, loading } = useCs();

  const activeJobs = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return shipments.filter(
      (s) =>
        s.status === 'Active' &&
        (!q ||
          s.jobNo.toLowerCase().includes(q) ||
          s.shipper.toLowerCase().includes(q) ||
          s.consignee.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q))
    );
  }, [shipments, search]);

  const [rowStates, setRowStates] = React.useState<Record<string, RowState>>({});
  // Latest typed value per row, readable from timers without stale closures.
  const latest = React.useRef<Record<string, { remark: string; remarkDate: string | null }>>({});
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const idleTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveFn = React.useRef(updateShipmentRemark);
  saveFn.current = updateShipmentRemark;

  const patchRow = React.useCallback((id: string, patch: Partial<RowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { remark: '', remarkDate: null, saveState: 'idle' as SaveState }), ...patch },
    }));
  }, []);

  const save = React.useCallback(
    async (id: string) => {
      const value = latest.current[id];
      if (!value) return;
      clearTimeout(timers.current[id]);
      delete timers.current[id];
      patchRow(id, { saveState: 'saving', error: undefined });
      try {
        await saveFn.current(id, value.remark, value.remarkDate);
        // If the user kept typing while we saved, leave the row in "typing".
        setRowStates((prev) => {
          const row = prev[id];
          if (!row || row.saveState !== 'saving') return prev;
          return { ...prev, [id]: { ...row, saveState: 'saved' } };
        });
        clearTimeout(idleTimers.current[id]);
        idleTimers.current[id] = setTimeout(() => {
          setRowStates((prev) => {
            const row = prev[id];
            if (!row || row.saveState !== 'saved') return prev;
            const { [id]: _drop, ...rest } = prev; // fall back to store value
            return rest;
          });
        }, 2000);
      } catch (err) {
        patchRow(id, { saveState: 'error', error: errorMessage(err) });
      }
    },
    [patchRow]
  );

  const handleChange = (shipment: Shipment, value: string) => {
    const id = shipment.id;
    const remarkDate = value.trim() ? todayISO() : null;
    latest.current[id] = { remark: value, remarkDate };
    patchRow(id, { remark: value, remarkDate, saveState: 'typing', error: undefined });
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => save(id), DEBOUNCE_MS);
  };

  // Don't lose text if the user navigates away mid-debounce: flush instead of discard.
  React.useEffect(() => {
    const pending = timers.current;
    const idle = idleTimers.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const pendingValues = latest;
    return () => {
      Object.keys(pending).forEach((id) => {
        clearTimeout(pending[id]);
        const v = pendingValues.current[id];
        if (v) void saveFn.current(id, v.remark, v.remarkDate).catch(() => undefined);
      });
      Object.values(idle).forEach(clearTimeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (activeJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <ClipboardCheck className="h-6 w-6 text-slate-400" />
        </div>
        <p className="font-heading text-sm font-semibold text-slate-700">No active jobs</p>
        <p className="mt-1 text-sm text-slate-500">
          {search ? 'No active job matches your search.' : 'Confirm an enquiry to create a job.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="min-w-[180px] font-semibold text-slate-600">Job No</TableHead>
              <TableHead className="min-w-[200px] font-semibold text-slate-600">Shipper → Consignee</TableHead>
              <TableHead className="min-w-[320px] font-semibold text-slate-600">Today&apos;s Remark</TableHead>
              <TableHead className="min-w-[140px] font-semibold text-slate-600">Remark Date</TableHead>
              <TableHead className="min-w-[130px] font-semibold text-slate-600">Save Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeJobs.map((shipment) => {
              const state: RowState = rowStates[shipment.id] ?? {
                remark: shipment.remark,
                remarkDate: shipment.remarkDate,
                saveState: 'idle',
              };
              return (
                <TableRow key={shipment.id} className="border-slate-100 hover:bg-blue-50/20">
                  <TableCell>
                    <div className="space-y-1.5">
                      <span className="font-mono text-sm font-semibold text-slate-800">{shipment.jobNo}</span>
                      {shipment.mode && <div><ModePill mode={shipment.mode} /></div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span className="font-medium text-slate-700">{shipment.shipper || '—'}</span>
                      <span className="text-slate-400">↓</span>
                      <span className="text-slate-600">{shipment.consignee || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={state.remark}
                      onChange={(e) => handleChange(shipment, e.target.value)}
                      onBlur={() => timers.current[shipment.id] && save(shipment.id)}
                      placeholder="Enter today's status update..."
                      rows={2}
                      className={cn(
                        'resize-none text-sm transition-colors',
                        state.saveState === 'typing' && 'border-blue-300 focus-visible:ring-blue-100',
                        state.saveState === 'saving' && 'border-blue-400 bg-blue-50/50',
                        state.saveState === 'saved' && 'border-emerald-300 bg-emerald-50/40',
                        state.saveState === 'error' && 'border-rose-300 bg-rose-50/40'
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    {state.remarkDate ? (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {formatDate(state.remarkDate, { day: '2-digit', month: 'short' })}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SaveIndicator
                      state={state.saveState}
                      error={state.error}
                      onRetry={() => save(shipment.id)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
