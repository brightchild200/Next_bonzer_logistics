'use client';

import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/supabase/queries';
import type { Enquiry } from '@/lib/types';

export function CancelEnquiryDialog({
  enquiry,
  open,
  onOpenChange,
  onConfirm,
}: {
  enquiry: Enquiry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (remark: string) => Promise<void>;
}) {
  const [remark, setRemark] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setRemark('');
      setError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!remark.trim()) {
      setError('Cancellation remark is required.');
      return;
    }
    setSaving(true);
    try {
      await onConfirm(remark.trim());
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <DialogTitle className="font-heading text-lg font-bold text-slate-900">Cancel Enquiry</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            You are about to cancel{' '}
            <span className="font-mono font-semibold text-slate-700">{enquiry?.enquiryNo}</span>
            {enquiry ? ` (${enquiry.customerName})` : ''}. Please provide a cancellation remark.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-600">
            Cancellation Remark <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            value={remark}
            onChange={(e) => {
              setRemark(e.target.value);
              setError(null);
            }}
            placeholder="Enter reason for cancellation..."
            className={error ? 'border-rose-300 focus-visible:ring-rose-100' : ''}
            rows={3}
          />
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          <Button onClick={handleConfirm} disabled={saving} className="bg-rose-600 text-white hover:bg-rose-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Cancellation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
