'use client';

import * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { ModePill, JobBadge } from './badges';
import { MilestoneStepper } from './milestone-stepper';
import type { Shipment } from '@/lib/types';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

export function TrackingTable({ shipments }: { shipments: Shipment[] }) {
  const fmtDate = (d: string | null) => {
    if (!d) return <span className="text-slate-300">—</span>;
    return (
      <span className="whitespace-nowrap text-xs text-slate-600">
        {formatDate(d, { day: '2-digit', month: 'short', year: '2-digit' })}
      </span>
    );
  };

  const th = 'whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-600';
  const td = 'px-3 py-3 text-sm align-top';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto scrollbar-thin">
        <Table className="min-w-[2200px]">
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className={th}>Job No & Date</TableHead>
              <TableHead className={th}>Invoice No</TableHead>
              <TableHead className={th}>Shipper</TableHead>
              <TableHead className={th}>Consignee</TableHead>
              <TableHead className={th}>Mode & Carrier</TableHead>
              <TableHead className={th}>POL & POD</TableHead>
              <TableHead className={th}>Container Nos</TableHead>
              <TableHead className={th}>HBL/HAWBL</TableHead>
              <TableHead className={th}>MBL/MAWBL</TableHead>
              <TableHead className={th}>S/Bill or BOE No</TableHead>
              <TableHead className={th}>S/Bill Date</TableHead>
              <TableHead className={th}>LEO Date</TableHead>
              <TableHead className={th}>ETD</TableHead>
              <TableHead className={th}>ETA</TableHead>
              <TableHead className={th}>Handover Date</TableHead>
              <TableHead className={th}>Delivery Date</TableHead>
              <TableHead className={th}>BL Type</TableHead>
              <TableHead className={th}>Services</TableHead>
              <TableHead className={th}>Packages / G.Wt</TableHead>
              <TableHead className={th}>Latest Remark & Date</TableHead>
              <TableHead className={th}>Status & Milestone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((s) => (
              <TableRow key={s.id} className="border-slate-100 hover:bg-blue-50/20">
                <TableCell className={td}>
                  <div className="space-y-1">
                    <JobBadge jobNo={s.jobNo} />
                    {fmtDate(s.date)}
                  </div>
                </TableCell>
                <TableCell className={cn(td, 'font-mono text-xs text-slate-600')}>
                  {s.invoiceNo}
                </TableCell>
                <TableCell className={cn(td, 'font-medium text-slate-700')}>
                  {s.shipper}
                </TableCell>
                <TableCell className={cn(td, 'text-slate-600')}>{s.consignee}</TableCell>
                <TableCell className={td}>
                  <div className="space-y-1">
                    {s.mode && <ModePill mode={s.mode} />}
                    <span className="block text-xs text-slate-500">{s.carrier || '—'}</span>
                  </div>
                </TableCell>
                <TableCell className={td}>
                  <div className="text-xs text-slate-600">
                    <p className="font-medium text-slate-700">{s.pol}</p>
                    <p className="text-slate-400">↓</p>
                    <p className="font-medium text-slate-700">{s.pod}</p>
                  </div>
                </TableCell>
                <TableCell className={td}>
                  <div className="text-xs text-slate-600">
                    <p>{s.containerNos || <span className="text-slate-300">—</span>}</p>
                  </div>
                </TableCell>
                <TableCell className={cn(td, 'font-mono text-xs text-slate-600')}>
                  {s.hbl}
                </TableCell>
                <TableCell className={cn(td, 'font-mono text-xs text-slate-600')}>
                  {s.mbl}
                </TableCell>
                <TableCell className={cn(td, 'font-mono text-xs text-slate-600')}>
                  {s.sbillOrBoeNo}
                </TableCell>
                <TableCell className={td}>{fmtDate(s.sbillOrBoeDate)}</TableCell>
                <TableCell className={td}>{fmtDate(s.leoDate)}</TableCell>
                <TableCell className={td}>{fmtDate(s.etd)}</TableCell>
                <TableCell className={td}>{fmtDate(s.eta)}</TableCell>
                <TableCell className={td}>{fmtDate(s.handoverDate)}</TableCell>
                <TableCell className={td}>{fmtDate(s.deliveryDate)}</TableCell>
                <TableCell className={td}>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {s.blType}
                  </span>
                </TableCell>
                <TableCell className={cn(td, 'text-xs text-slate-600')}>
                  {s.services}
                </TableCell>
                <TableCell className={td}>
                  <div className="text-xs text-slate-600">
                    <p className="font-medium text-slate-700">{s.packages} pkgs</p>
                    <p>{s.grossWeight.toLocaleString('en-IN')} {s.weightUnit}</p>
                  </div>
                </TableCell>
                <TableCell className={td}>
                  <div className="max-w-[200px] text-xs text-slate-600">
                    <p className="line-clamp-2">{s.remark}</p>
                    {s.remarkDate && (
                      <p className="mt-1 text-slate-400">
                        {formatDate(s.remarkDate, { day: '2-digit', month: 'short' })}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className={td}>
                  <div className="space-y-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                        s.status === 'Active'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      )}
                    >
                      {s.status}
                    </span>
                    <MilestoneStepper current={s.milestone} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
