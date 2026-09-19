'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, ArrowLeft, ArrowRight, Upload, X, Search, Truck, Package, User } from 'lucide-react';
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
import type { Customer } from '@/lib/actions/customers/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createEnquiry } from '@/lib/actions/enquiries';
import { searchCompanyNames } from '@/lib/actions/customers/search-company-names';
import { searchShippers } from '@/lib/actions/shippers/search-shippers';
import { searchConsignees } from '@/lib/actions/consignees/search-consignees';

const steps = ['Customer & Party', 'Shipment Details', 'Cargo & Review'];

const modes = [
  { value: 'air', label: 'Air Freight' },
  { value: 'sea', label: 'Sea Freight' },
  { value: 'road', label: 'Road Transport' },
  { value: 'rail', label: 'Rail Freight' },
];

const incoterms = ['EXW', 'FOB', 'CIF', 'DDP', 'FCA', 'DAP'];

interface SearchableOption {
  id: string;
  label: string;
  subLabel?: string;
}

export function EnquiryForm({
  open,
  setOpen,
  enquiry,
  onSaved,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  enquiry?: { 
    id: string; 
    reference: string; 
    status: string; 
    customer_id?: string | null; 
    customer_name?: string | null; 
    origin?: string | null; 
    destination?: string | null; 
    mode?: string; 
    cargo_type?: string | null; 
    weight_kg?: number | null; 
    volume_cbm?: number | null; 
    incoterm?: string | null; 
    expected_shipment_date?: string | null; 
    notes?: string | null;
    shipper_id?: string | null;
    consignee_id?: string | null;
  } | null;
  onSaved?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [shipperSearch, setShipperSearch] = useState('');
  const [consigneeSearch, setConsigneeSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<SearchableOption[]>([]);
  const [shipperResults, setShipperResults] = useState<SearchableOption[]>([]);
  const [consigneeResults, setConsigneeResults] = useState<SearchableOption[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [shipperSearchLoading, setShipperSearchLoading] = useState(false);
  const [consigneeSearchLoading, setConsigneeSearchLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showShipperDropdown, setShowShipperDropdown] = useState(false);
  const [showConsigneeDropdown, setShowConsigneeDropdown] = useState(false);

  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    shipper_id: '',
    consignee_id: '',
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

  // Debounced search timers
  const [customerSearchTimer, setCustomerSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [shipperSearchTimer, setShipperSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [consigneeSearchTimer, setConsigneeSearchTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      if (enquiry) {
        setForm({
          customer_id: enquiry.customer_id ?? '',
          customer_name: enquiry.customer_name ?? '',
          shipper_id: enquiry.shipper_id ?? '',
          consignee_id: enquiry.consignee_id ?? '',
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
          shipper_id: '',
          consignee_id: '',
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

  const setField = useCallback((k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
  }, []);

  const canNext = useCallback(() => {
    if (step === 0) return form.customer_id || form.customer_name;
    if (step === 1) return form.origin && form.destination;
    return true;
  }, [step, form]);

  // Search handlers with debouncing
  const handleCustomerSearch = useCallback(async (value: string) => {
    setCustomerSearch(value);
    setShowCustomerDropdown(true);
    
    if (customerSearchTimer) clearTimeout(customerSearchTimer);
    
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setCustomerResults([]);
        return;
      }
      setCustomerSearchLoading(true);
      try {
        const result = await searchCompanyNames(value.trim(), 10);
        if (result.success) {
          setCustomerResults(result.companies.map(c => ({
            id: c.id,
            label: c.company_name,
            subLabel: c.customer_ref,
          })));
        }
      } catch (err) {
        console.error('Customer search error:', err);
      } finally {
        setCustomerSearchLoading(false);
      }
    }, 300);
    
    setCustomerSearchTimer(timer);
  }, [customerSearchTimer]);

  const handleShipperSearch = useCallback(async (value: string) => {
    setShipperSearch(value);
    setShowShipperDropdown(true);
    
    if (shipperSearchTimer) clearTimeout(shipperSearchTimer);
    
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setShipperResults([]);
        return;
      }
      setShipperSearchLoading(true);
      try {
        const result = await searchShippers({ searchText: value.trim(), limit: 10 });
        if (result.success) {
          setShipperResults(result.shippers.map(s => ({
            id: s.id,
            label: s.company_name,
            subLabel: s.shipper_ref,
          })));
        }
      } catch (err) {
        console.error('Shipper search error:', err);
      } finally {
        setShipperSearchLoading(false);
      }
    }, 300);
    
    setShipperSearchTimer(timer);
  }, [shipperSearchTimer]);

  const handleConsigneeSearch = useCallback(async (value: string) => {
    setConsigneeSearch(value);
    setShowConsigneeDropdown(true);
    
    if (consigneeSearchTimer) clearTimeout(consigneeSearchTimer);
    
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setConsigneeResults([]);
        return;
      }
      setConsigneeSearchLoading(true);
      try {
        const result = await searchConsignees({ searchText: value.trim(), limit: 10 });
        if (result.success) {
          setConsigneeResults(result.consignees.map(c => ({
            id: c.id,
            label: c.company_name,
            subLabel: c.consignee_ref,
          })));
        }
      } catch (err) {
        console.error('Consignee search error:', err);
      } finally {
        setConsigneeSearchLoading(false);
      }
    }, 300);
    
    setConsigneeSearchTimer(timer);
  }, [consigneeSearchTimer]);

  const selectCustomer = useCallback((customer: SearchableOption) => {
    setField('customer_id', customer.id);
    setField('customer_name', customer.label);
    setCustomerSearch(customer.label);
    setCustomerResults([]);
    setShowCustomerDropdown(false);
  }, [setField]);

  const selectShipper = useCallback((shipper: SearchableOption) => {
    setField('shipper_id', shipper.id);
    setShipperSearch(shipper.label);
    setShipperResults([]);
    setShowShipperDropdown(false);
  }, [setField]);

  const selectConsignee = useCallback((consignee: SearchableOption) => {
    setField('consignee_id', consignee.id);
    setConsigneeSearch(consignee.label);
    setConsigneeResults([]);
    setShowConsigneeDropdown(false);
  }, [setField]);

  const clearCustomer = useCallback(() => {
    setField('customer_id', '');
    setField('customer_name', '');
    setCustomerSearch('');
    setCustomerResults([]);
  }, [setField]);

  const clearShipper = useCallback(() => {
    setField('shipper_id', '');
    setShipperSearch('');
    setShipperResults([]);
  }, [setField]);

  const clearConsignee = useCallback(() => {
    setField('consignee_id', '');
    setConsigneeSearch('');
    setConsigneeResults([]);
  }, [setField]);

  const handleSubmit = async () => {
    setLoading(true);

    const payload = {
      reference: enquiry?.reference ?? `ENQ-${Date.now().toString().slice(-6)}`,
      customer_id: form.customer_id || null,
      customer_name: form.customer_name || null,
      shipper_id: form.shipper_id || null,
      consignee_id: form.consignee_id || null,
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

  const renderSearchableField = ({
    label,
    value,
    onChange,
    onSelect,
    onClear,
    results,
    loading,
    showDropdown,
    setShowDropdown,
    placeholder,
    hasValue,
    leftIcon,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onSelect: (opt: SearchableOption) => void;
    onClear: () => void;
    results: SearchableOption[];
    loading: boolean;
    showDropdown: boolean;
    setShowDropdown: (v: boolean) => void;
    placeholder: string;
    hasValue: boolean;
    leftIcon?: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className={cn(
              leftIcon ? 'pl-10' : '',
              hasValue ? 'pr-10' : ''
            )}
          />
          {hasValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {(showDropdown || results.length > 0) && (
          <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-lg">
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {results.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none flex items-center gap-2"
                onClick={() => onSelect(opt)}
              >
                <div className="flex-1 text-sm">
                  <p className="font-medium">{opt.label}</p>
                  {opt.subLabel && <p className="text-xs text-muted-foreground">{opt.subLabel}</p>}
                </div>
              </button>
            ))}
            {results.length === 0 && !loading && value.trim().length >= 2 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl gap-0 p-0">
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

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
          {/* Step 0: Customer & Party */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label>Customer <span className="text-xs text-muted-foreground font-normal">(Required)</span></Label>
                {renderSearchableField({
                  label: '',
                  value: form.customer_name || customerSearch,
                  onChange: handleCustomerSearch,
                  onSelect: selectCustomer,
                  onClear: clearCustomer,
                  results: customerResults,
                  loading: customerSearchLoading,
                  showDropdown: showCustomerDropdown,
                  setShowDropdown: setShowCustomerDropdown,
                  placeholder: 'Search customer by name, reference, GST, PAN…',
                  hasValue: !!form.customer_id,
                  leftIcon: <User className="h-4 w-4" />,
                })}
                <p className="text-xs text-muted-foreground">
                  Select from Customer Master. Shippers/Consignees are derived from Customer Master.
                </p>
              </div>

              {/* Shipper */}
              <div className="space-y-2">
                <Label>Shipper <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                {renderSearchableField({
                  label: '',
                  value: shipperSearch,
                  onChange: handleShipperSearch,
                  onSelect: selectShipper,
                  onClear: clearShipper,
                  results: shipperResults,
                  loading: shipperSearchLoading,
                  showDropdown: showShipperDropdown,
                  setShowDropdown: setShowShipperDropdown,
                  placeholder: 'Search shipper by name or reference…',
                  hasValue: !!form.shipper_id,
                  leftIcon: <Truck className="h-4 w-4" />,
                })}
                <p className="text-xs text-muted-foreground">
                  Derived from Customer Master. Links via source_customer_id.
                </p>
              </div>

              {/* Consignee */}
              <div className="space-y-2">
                <Label>Consignee <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                {renderSearchableField({
                  label: '',
                  value: consigneeSearch,
                  onChange: handleConsigneeSearch,
                  onSelect: selectConsignee,
                  onClear: clearConsignee,
                  results: consigneeResults,
                  loading: consigneeSearchLoading,
                  showDropdown: showConsigneeDropdown,
                  setShowDropdown: setShowConsigneeDropdown,
                  placeholder: 'Search consignee by name or reference…',
                  hasValue: !!form.consignee_id,
                  leftIcon: <Package className="h-4 w-4" />,
                })}
                <p className="text-xs text-muted-foreground">
                  Derived from Customer Master. Links via source_customer_id.
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Shipment Details */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin (POL) <span className="text-xs text-muted-foreground font-normal">(Required)</span></Label>
                <Input
                  placeholder="e.g. Shanghai, China"
                  value={form.origin}
                  onChange={(e) => setField('origin', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Destination (POD) <span className="text-xs text-muted-foreground font-normal">(Required)</span></Label>
                <Input
                  placeholder="e.g. Rotterdam, Netherlands"
                  value={form.destination}
                  onChange={(e) => setField('destination', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Shipment Mode</Label>
                <Select value={form.mode} onValueChange={(v) => setField('mode', v)}>
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
                <Select value={form.incoterm} onValueChange={(v) => setField('incoterm', v)}>
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
                  onChange={(e) => setField('expected_shipment_date', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Cargo & Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo Type</Label>
                  <Input
                    placeholder="e.g. Electronics, General Cargo"
                    value={form.cargo_type}
                    onChange={(e) => setField('cargo_type', e.target.value)}
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
                    onChange={(e) => setField('weight_kg', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volume (CBM)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.volume_cbm}
                    onChange={(e) => setField('volume_cbm', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional details, special instructions…"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
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
                    {form.customer_name || '—'}
                  </dd>
                  <dt className="text-muted-foreground">Shipper</dt>
                  <dd className="font-medium">
                    {shipperResults.find(s => s.id === form.shipper_id)?.label || (form.shipper_id ? 'Selected' : '—')}
                  </dd>
                  <dt className="text-muted-foreground">Consignee</dt>
                  <dd className="font-medium">
                    {consigneeResults.find(c => c.id === form.consignee_id)?.label || (form.consignee_id ? 'Selected' : '—')}
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