import { cn } from '@/lib/utils';
import type { EnquiryStatus, ShipmentMode } from '@/lib/types';

const statusStyles: Record<EnquiryStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}

const modePillStyles: Record<string, string> = {
  'Air Export': 'bg-blue-50 text-blue-700 border-blue-200',
  'Air Import': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Sea FCL Import': 'bg-teal-50 text-teal-700 border-teal-200',
  'Sea FCL Export': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Sea LCL': 'bg-sky-50 text-sky-700 border-sky-200',
  Courier: 'bg-orange-50 text-orange-700 border-orange-200',
  'Ex-Bond': 'bg-slate-100 text-slate-700 border-slate-300',
};

export function ModePill({ mode }: { mode: ShipmentMode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        modePillStyles[mode] || 'bg-slate-100 text-slate-700 border-slate-300'
      )}
    >
      {mode}
    </span>
  );
}

export function JobBadge({ jobNo }: { jobNo: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white">
      {jobNo}
    </span>
  );
}
