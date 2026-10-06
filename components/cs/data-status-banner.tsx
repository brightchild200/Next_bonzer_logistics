'use client';

import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCs } from '@/lib/cs-store';

export function DataStatusBanner() {
  const { loadError, warning, reload, loading } = useCs();

  if (loadError) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Couldn&apos;t load data from Supabase</p>
          <p className="mt-0.5 break-words text-rose-700">{loadError}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={reload}
          disabled={loading}
          className="shrink-0 border-rose-300 bg-white text-rose-700 hover:bg-rose-100"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    );
  }

  if (warning) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1">{warning}</p>
      </div>
    );
  }

  return null;
}
