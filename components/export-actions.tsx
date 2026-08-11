'use client';

import { useMemo, useState } from 'react';
import { Download, Printer, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface ExportRangeValue {
  from: string;
  to: string;
}

export function ExportActions({
  onExport,
  onPrint,
  exportLabel = 'Export',
  printLabel = 'Print',
  disableExport = false,
  disablePrint = false,
  defaultFrom = '',
  defaultTo = '',
}: {
  onExport: (range: ExportRangeValue) => Promise<void> | void;
  onPrint: (range: ExportRangeValue) => Promise<void> | void;
  exportLabel?: string;
  printLabel?: string;
  disableExport?: boolean;
  disablePrint?: boolean;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'export' | 'print'>('export');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);

  const title = useMemo(() => (mode === 'export' ? exportLabel : printLabel), [mode, exportLabel, printLabel]);

  const run = async () => {
    setBusy(true);
    try {
      const payload = { from, to };
      if (mode === 'export') {
        await onExport(payload);
      } else {
        await onPrint(payload);
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disableExport}
          onClick={() => {
            setMode('export');
            setOpen(true);
          }}
        >
          <Download className="h-4 w-4" /> {exportLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disablePrint}
          onClick={() => {
            setMode('print');
            setOpen(true);
          }}
        >
          <Printer className="h-4 w-4" /> {printLabel}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Choose a date range to include the records you want.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={run} disabled={busy}>
              <Calendar className="mr-2 h-4 w-4" />
              {mode === 'export' ? 'Generate Excel' : 'Open Print View'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
