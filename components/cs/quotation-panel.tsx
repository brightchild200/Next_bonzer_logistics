'use client';

import * as React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import type { Enquiry } from '@/lib/types';
import { ModePill } from './badges';
import { useCs } from '@/lib/cs-store';
import { chargeAmountInr, formatInr, totalInr } from '@/lib/charges';
import { formatDate } from '@/lib/date';

export function QuotationPanel({
  enquiry,
  open,
  onOpenChange,
}: {
  enquiry: Enquiry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { company } = useCs();
  const total = React.useMemo(() => (enquiry ? totalInr(enquiry.charges) : 0), [enquiry]);

  if (!enquiry) return null;

  const companyLine = [company?.address, company?.gst ? `GST: ${company.gst}` : '', company?.phone, company?.email]
    .filter(Boolean)
    .join(' | ');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="print-area w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetTitle className="sr-only">Quotation {enquiry.enquiryNo}</SheetTitle>
        <SheetDescription className="sr-only">Quotation and charge breakdown</SheetDescription>

        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4 pr-14">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">Quotation / Invoice</h2>
            <p className="text-sm text-slate-500">{enquiry.enquiryNo}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {company?.name && <h3 className="font-heading text-xl font-bold text-slate-900">{company.name}</h3>}
                {companyLine && <p className="mt-0.5 text-xs text-slate-500">{companyLine}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quotation No</p>
                <p className="font-mono text-sm font-bold text-blue-700">{enquiry.enquiryNo}</p>
                <p className="text-xs text-slate-500">{formatDate(enquiry.date)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 text-sm">
            <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Customer</p>
            <p className="font-medium text-slate-800">{enquiry.customerName}</p>
            {enquiry.customerAddress && <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500">{enquiry.customerAddress}</p>}
            {enquiry.customerGst && <p className="mt-0.5 text-xs text-slate-500">GST: {enquiry.customerGst}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Shipper</p>
              <p className="font-medium text-slate-800">{enquiry.shipper || '—'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Consignee</p>
              <p className="font-medium text-slate-800">{enquiry.consignee || '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-slate-400">Mode: </span>
              {enquiry.mode ? <ModePill mode={enquiry.mode} /> : '—'}
            </div>
            <div>
              <span className="text-slate-400">Route: </span>
              <span className="font-medium text-slate-700">
                {enquiry.polPort} → {enquiry.podPort}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Commodity: </span>
              <span className="font-medium text-slate-700">{enquiry.commodity}</span>
            </div>
            <div>
              <span className="text-slate-400">Packages: </span>
              <span className="font-medium text-slate-700">
                {enquiry.packages} {enquiry.packageUnit}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Gross Wt: </span>
              <span className="font-medium text-slate-700">
                {enquiry.grossWeight} {enquiry.weightUnit}
              </span>
            </div>
            <div>
              <span className="text-slate-400">CBM: </span>
              <span className="font-medium text-slate-700">{enquiry.cbm}</span>
            </div>
            <div>
              <span className="text-slate-400">Sales Person: </span>
              <span className="font-medium text-slate-700">{enquiry.salesPerson || '—'}</span>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="mb-3 font-heading text-sm font-bold text-slate-900">Charge Breakdown</h4>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Description</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Qty</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Rate</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Ccy</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Ex Rate</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-slate-600">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enquiry.charges.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No charges recorded.</td>
                    </tr>
                  )}
                  {enquiry.charges.map((ch) => (
                    <tr key={ch.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 text-slate-700">{ch.description}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{ch.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{ch.rate.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{ch.currency}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {ch.currency === 'INR' ? '1.00' : ch.exchangeRate.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatInr(chargeAmountInr(ch))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-blue-50">
                    <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-800">Grand Total</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{formatInr(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {company?.terms && (
            <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
              <p className="font-semibold text-slate-600">Terms &amp; Conditions</p>
              <p className="mt-1 whitespace-pre-line leading-relaxed">{company.terms}</p>
            </div>
          )}

          {enquiry.status === 'Cancelled' && enquiry.cancellationRemark && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              <p className="font-semibold">Cancelled</p>
              <p className="mt-1">{enquiry.cancellationRemark}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
