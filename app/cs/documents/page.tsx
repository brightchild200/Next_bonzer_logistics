'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DocumentsTable } from '@/components/cs/documents-table';
import { useCs } from '@/lib/cs-store';
import { daysUntil } from '@/lib/date';

export default function DocumentsPage() {
  const { documents, loading } = useCs();
  const needAttention = documents.filter((d) => {
    const days = daysUntil(d.expiryDate);
    return days !== null && days < 60;
  }).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Customer Documents &amp; Expiry Alerts</h2>
          <p className="text-sm text-slate-500">Manage IEC, GST, PAN, and KYC documents with automated expiry tracking</p>
        </div>
        {!loading &&
          (needAttention > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">
                {needAttention} document{needAttention === 1 ? '' : 's'} expiring within 60 days or already expired
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="font-medium">No documents need attention</span>
            </div>
          ))}
      </div>

      <DocumentsTable />
    </div>
  );
}
