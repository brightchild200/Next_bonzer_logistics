'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, ArrowLeft, ArrowRight, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Customer } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createEnquiry } from '@/lib/actions/enquiries';

const steps = ['Customer', 'Shipment Details', 'Cargo & Review'];

const modes = [
  { value: 'air', label: 'Air Freight' },
  { value: 'sea', label: 'Sea Freight' },
  { value: 'road', label: 'Road Transport' },
  { value: 'rail', label: 'Rail Freight' },
];

const incoterms = ['EXW', 'FOB', 'CIF', 'DDP', 'FCA', 'DAP'];

export function EnquiryForm({
  open,
  setOpen,
  enquiry,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  enquiry?: { id: string; reference: string; status: string; customer_id?: string | null; customer_name?: string | null; origin?: string | null; destination?: string | null; mode?: string; cargo_type?: string | null; weight_kg?: number | null; volume_cbm?: number | null; incoterm?: string | null; expected_shipment_date?: string | null; notes?: string | null } | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    origin: '',
    destination: '',
    mode: 'sea',
    cargo_type: '',
    weight_kg: '',
    volume_cbm: '',
    incoterm: 'FOB',
    expected_shipment_date: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      // Supabase client not available in server actions, customers fetched from parent
      if (enquiry) {
        setForm({
          customer_id: enquiry.customer_id ?? '',
          customer_name: enquiry.customer_name ?? '',
          origin: enquiry.origin ?? '',
          destination: enquiry.destination ?? '',
          mode: enquiry.mode ?? 'sea',
          cargo_type: enquiry.cargo_type ?? '',
          weight_kg: enquiry.weight_kg?.toString() ?? '',
          volume_cbm: enquiry.volume_cbm?.toString() ?? '',
          incoterm: enquiry.incoterm ?? 'FOB',
          expected_shipment_date: enquiry.expected_shipment_date ?? '',
          notes: enquiry.notes ?? '',
        });
      } else {
        setForm({
          customer_id: '',
          customer_name: '',
          origin: '',
          destination: '',
          mode: 'sea',
          cargo_type: '',
          weight_kg: '',
          volume_cbm: '',
          incoterm: 'FOB',
          expected_shipment_date: '',
          notes: '',
        });
      }
      setStep(0);
    }
  }, [open, enquiry]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.customer_id || form.customer_name;
    if (step === 1) return form.origin && form.destination;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    const customer = customers.find((c) => c.id === form.customer_id);

    const payload = {
      reference: enquiry?.reference ?? `ENQ-${Date.now().toString().slice(-6)}`,
      customer_id: form.customer_id || null,
      customer_name: customer?.company_name ?? form.customer_name,
      origin: form.origin,
      destination: form.destination,
      mode: form.mode,
      cargo_type: form.cargo_type,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      volume_cbm: form.volume_cbm ? parseFloat(form.volume_cbm) : null,
      incoterm: form.incoterm,
      expected_shipment_date: form.expected_shipment_date || null,
      notes: form.notes,
      status: (enquiry?.status ?? 'new') as 'new' | 'quoted' | 'won' | 'lost' | 'archived',
    };

    try {
      const result = await createEnquiry(payload);

      if (!result.success) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      toast.success('Enquiry created successfully');
      setLoading(false);
      setOpen(false);
      onSaved?.();
    } catch (err) {
      console.error('Create enquiry error:', err);
      toast.error('Failed to create enquiry');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{enquiry ? 'Edit Enquiry' : 'Create New Enquiry'}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                  i < step && 'bg-success text-success-foreground',
                  i === step && 'bg-primary text-primary-foreground',
                  i > step && 'bg-muted text-muted-foreground'
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-sm font-medium',
                  i === step ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {s}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'ml-auto h-0.5 flex-1 rounded-full',
                    i < step ? 'bg-success' : 'bg-border'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={form.customer_id}
                  onValueChange={(v) => set('customer_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Or enter new customer name</Label>
                <Input
                  placeholder="Customer name (if not in list)"
                  value={form.customer_name}
                  onChange={(e) => set('customer_name', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input
                  placeholder="e.g. Shanghai, China"
                  value={form.origin}
                  onChange={(e) => set('origin', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input
                  placeholder="e.g. Rotterdam, Netherlands"
                  value={form.destination}
                  onChange={(e) => set('destination', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Shipment Mode</Label>
                <Select value={form.mode} onValueChange={(v) => set('mode', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modes.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Incoterm</Label>
                <Select value={form.incoterm} onValueChange={(v) => set('incoterm', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {incoterms.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Shipment Date</Label>
                <Input
                  type="date"
                  value={form.expected_shipment_date}
                  onChange={(e) => set('expected_shipment_date', e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo Type</Label>
                  <Input
                    placeholder="e.g. Electronics, General Cargo"
                    value={form.cargo_type}
                    onChange={(e) => set('cargo_type', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Incoterm</Label>
                  <Input value={form.incoterm} disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.weight_kg}
                    onChange={(e) => set('weight_kg', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume (CBM)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.volume_cbm}
                    onChange={(e) => set('volume_cbm', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional details, special instructions…"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="flex h-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <div className="text-center">
                    <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Drop files or click to upload
                    </p>
                  </div>
                </div>
              </div>

              {/* Review summary */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Review
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-medium">
                    {customers.find((c) => c.id === form.customer_id)?.company_name ||
                      form.customer_name ||
                      '—'}
                  </dd>
                  <dt className="text-muted-foreground">Route</dt>
                  <dd className="font-medium">
                    {form.origin || '—'} → {form.destination || '—'}
                  </dd>
                  <dt className="text-muted-foreground">Mode</dt>
                  <dd className="font-medium capitalize">{form.mode}</dd>
                  <dt className="text-muted-foreground">Cargo</dt>
                  <dd className="font-medium">{form.cargo_type || '—'}</dd>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? setOpen(false) : setStep(step - 1))}
          >
            {step === 0 ? (
              <>
                <X className="mr-2 h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </>
            )}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                enquiry ? 'Update Enquiry' : 'Create Enquiry'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
