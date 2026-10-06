'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, ArrowLeft, ArrowRight, Upload, X, Search, Truck, Package, User, Ship, MapPin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createEnquiry } from '@/lib/actions/enquiries';
import { searchCompanyNames } from '@/lib/actions/customers/search-company-names';
import { searchShippers } from '@/lib/actions/shippers/search-shippers';
import { searchConsignees } from '@/lib/actions/consignees/search-consignees';
import { searchPols, type PolSearchResult } from '@/lib/actions/enquiries/search-pols';
import { searchPods, type PodSearchResult } from '@/lib/actions/enquiries/search-pods';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
  const [loading, setLoading] = useState(false);

  const [customerOptions, setCustomerOptions] = useState<SearchableOption[]>([]);
  const [shipperOptions, setShipperOptions] = useState<SearchableOption[]>([]);
  const [consigneeOptions, setConsigneeOptions] = useState<SearchableOption[]>([]);
  const [polOptions, setPolOptions] = useState<SearchableOption[]>([]);
  const [podOptions, setPodOptions] = useState<SearchableOption[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [shipperSearchLoading, setShipperSearchLoading] = useState(false);
  const [consigneeSearchLoading, setConsigneeSearchLoading] = useState(false);
  const [polSearchLoading, setPolSearchLoading] = useState(false);
  const [podSearchLoading, setPodSearchLoading] = useState(false);

  const [customerSearchTimer, setCustomerSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [shipperSearchTimer, setShipperSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [consigneeSearchTimer, setConsigneeSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [polSearchTimer, setPolSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [podSearchTimer, setPodSearchTimer] = useState<NodeJS.Timeout | null>(null);

  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    shipper_id: '',
    consignee_id: '',
    pol_id: '',
    pod_id: '',
    origin: '',
    destination: '',
    pol_country: '',
    pod_country: '',
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
      if (enquiry) {
        setForm({
          customer_id: enquiry.customer_id ?? '',
          customer_name: enquiry.customer_name ?? '',
          shipper_id: enquiry.shipper_id ?? '',
          consignee_id: enquiry.consignee_id ?? '',
          pol_id: (enquiry as any).pol_id ?? '',
          pod_id: (enquiry as any).pod_id ?? '',
          origin: enquiry.origin ?? '',
          destination: enquiry.destination ?? '',
          pol_country: '',
          pod_country: '',
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
          pol_id: '',
          pod_id: '',
          origin: '',
          destination: '',
          pol_country: '',
          pod_country: '',
          mode: 'sea',
          cargo_type: '',
          weight_kg: '',
          volume_cbm: '',
          incoterm: 'FOB',
          expected_shipment_date: '',
          notes: '',
        });
      }
    }
  }, [open, enquiry]);

  const setField = useCallback((k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
  }, []);

  const handleCustomerSearch = useCallback(async (value: string) => {
    if (customerSearchTimer) clearTimeout(customerSearchTimer);
    
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setCustomerOptions([]);
        return;
      }
      setCustomerSearchLoading(true);
      try {
        const result = await searchCompanyNames(value.trim(), 10);
        if (result.success) {
          setCustomerOptions(result.companies.map(c => ({
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
    if (shipperSearchTimer) clearTimeout(shipperSearchTimer);
    
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setShipperOptions([]);
        return;
      }
      setShipperSearchLoading(true);
      try {
        const result = await searchShippers({ searchText: value.trim(), limit: 10 });
        if (result.success) {
          setShipperOptions(result.shippers.map(s => ({
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
    if (consigneeSearchTimer) clearTimeout(consigneeSearchTimer);
    
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setConsigneeOptions([]);
        return;
      }
      setConsigneeSearchLoading(true);
      try {
        const result = await searchConsignees({ searchText: value.trim(), limit: 10 });
        if (result.success) {
          setConsigneeOptions(result.consignees.map(c => ({
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

  const handlePolSearch = useCallback(async (value: string) => {
    if (polSearchTimer) clearTimeout(polSearchTimer);
    
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setPolOptions([]);
        return;
      }
      setPolSearchLoading(true);
      try {
        const result = await searchPols({ searchText: value.trim(), limit: 10 });
        if (result.success) {
          setPolOptions(result.pols.map(p => ({
            id: p.id,
            label: p.name,
            subLabel: `${p.city || ''}${p.city && p.country_name ? ', ' : ''}${p.country_name || ''}`,
          })));
        }
      } catch (err) {
        console.error('POL search error:', err);
      } finally {
        setPolSearchLoading(false);
      }
    }, 300);
    
    setPolSearchTimer(timer);
  }, [polSearchTimer]);

  const handlePodSearch = useCallback(async (value: string) => {
    if (podSearchTimer) clearTimeout(podSearchTimer);
    
    const timer = setTimeout(async () => {
      if (value.trim().length < 2) {
        setPodOptions([]);
        return;
      }
      setPodSearchLoading(true);
      try {
        const result = await searchPods({ searchText: value.trim(), limit: 10 });
        if (result.success) {
          setPodOptions(result.pods.map(p => ({
            id: p.id,
            label: p.name,
            subLabel: `${p.city || ''}${p.city && p.country_name ? ', ' : ''}${p.country_name || ''}`,
          })));
        }
      } catch (err) {
        console.error('POD search error:', err);
      } finally {
        setPodSearchLoading(false);
      }
    }, 300);
    
    setPodSearchTimer(timer);
  }, [podSearchTimer]);

  const selectCustomer = useCallback((customer: SearchableOption | null) => {
    if (customer) {
      setField('customer_id', customer.id);
      setField('customer_name', customer.label);
    } else {
      setField('customer_id', '');
      setField('customer_name', '');
    }
  }, [setField]);

  const selectShipper = useCallback((shipper: SearchableOption | null) => {
    if (shipper) {
      setField('shipper_id', shipper.id);
    } else {
      setField('shipper_id', '');
    }
  }, [setField]);

  const selectConsignee = useCallback((consignee: SearchableOption | null) => {
    if (consignee) {
      setField('consignee_id', consignee.id);
    } else {
      setField('consignee_id', '');
    }
  }, [setField]);

  const selectPol = useCallback((pol: SearchableOption | null) => {
    if (pol) {
      setField('pol_id', pol.id);
      setField('origin', pol.label);
      // Find the country from the options
      const selectedPol = polOptions.find(p => p.id === pol.id);
      if (selectedPol?.subLabel) {
        // Extract country from subLabel (format: "city, country")
        const country = selectedPol.subLabel.split(', ').pop() || '';
        setField('pol_country', country);
      }
    } else {
      setField('pol_id', '');
      setField('origin', '');
      setField('pol_country', '');
    }
  }, [setField, polOptions]);

  const selectPod = useCallback((pod: SearchableOption | null) => {
    if (pod) {
      setField('pod_id', pod.id);
      setField('destination', pod.label);
      // Find the country from the options
      const selectedPod = podOptions.find(p => p.id === pod.id);
      if (selectedPod?.subLabel) {
        // Extract country from subLabel (format: "city, country")
        const country = selectedPod.subLabel.split(', ').pop() || '';
        setField('pod_country', country);
      }
    } else {
      setField('pod_id', '');
      setField('destination', '');
      setField('pod_country', '');
    }
  }, [setField, podOptions]);

  const addNewCustomer = useCallback((name: string) => {
    setField('customer_id', '');
    setField('customer_name', name);
  }, [setField]);

  const addNewShipper = useCallback((name: string) => {
    setField('shipper_id', '');
  }, [setField]);

  const addNewConsignee = useCallback((name: string) => {
    setField('consignee_id', '');
  }, [setField]);

  const addNewPol = useCallback((name: string) => {
    setField('pol_id', '');
    setField('origin', name);
  }, [setField]);

  const addNewPod = useCallback((name: string) => {
    setField('pod_id', '');
    setField('destination', name);
  }, [setField]);

  const handleSubmit = async () => {
    setLoading(true);

    const payload = {
      reference: enquiry?.reference ?? `ENQ-${Date.now().toString().slice(-6)}`,
      customer_id: form.customer_id || null,
      customer_name: form.customer_name || null,
      shipper_id: form.shipper_id || null,
      consignee_id: form.consignee_id || null,
      pol_id: form.pol_id || null,
      pod_id: form.pod_id || null,
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

  const selectedCustomer = form.customer_id ? { id: form.customer_id, label: form.customer_name } : null;
  const selectedShipper = form.shipper_id ? { id: form.shipper_id, label: shipperOptions.find(s => s.id === form.shipper_id)?.label || '' } : null;
  const selectedConsignee = form.consignee_id ? { id: form.consignee_id, label: consigneeOptions.find(c => c.id === form.consignee_id)?.label || '' } : null;
  const selectedPol = form.pol_id ? { id: form.pol_id, label: form.origin } : null;
  const selectedPod = form.pod_id ? { id: form.pod_id, label: form.destination } : null;

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to enquiries" onClick={() => setOpen(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{enquiry ? 'Edit Enquiry' : 'New Enquiry'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create a new customer enquiry</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background shadow-sm">
          <form className="divide-y divide-border" onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          <section className="space-y-5 p-6 sm:p-8">
            <div><h2 className="text-lg font-semibold">Enquiry Information</h2><p className="text-sm text-muted-foreground">Capture the customer and enquiry context.</p></div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2"><Label>Enquiry No</Label><Input value={enquiry?.reference ?? 'Auto-generated on save'} disabled className="bg-muted/50" /></div>
              <div className="space-y-2"><Label>Enquiry Date</Label><Input type="date" value={form.expected_shipment_date || new Date().toISOString().slice(0, 10)} disabled className="bg-muted/50" /></div>
              {/* Customer */}
              <div className="space-y-2">
                <Label>Customer <span className="text-xs text-muted-foreground font-normal">(Required)</span></Label>
                <SearchableSelect
                  value={selectedCustomer}
                  onChange={selectCustomer}
                  options={customerOptions}
                  placeholder="Search customer by name, reference, GST, PAN…"
                  title="Select Customer"
                  searchPlaceholder="Search customer..."
                  showAddButton
                  addButtonText={`Add "${form.customer_name || ''}" as new customer`}
                  onAddNew={addNewCustomer}
                  loading={customerSearchLoading}
                  onSearchChange={handleCustomerSearch}
                  leftIcon={<User className="h-4 w-4" />}
                />
                <p className="text-xs text-muted-foreground">
                  Select from Customer Master. Shippers/Consignees are derived from Customer Master.
                </p>
              </div>

              {/* Shipper */}
              <div className="space-y-2">
                <Label>Shipper <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                <SearchableSelect
                  value={selectedShipper}
                  onChange={selectShipper}
                  options={shipperOptions}
                  placeholder="Search shipper by name or reference…"
                  title="Select Shipper"
                  searchPlaceholder="Search shipper..."
                  showAddButton
                  addButtonText={`Add "${form.shipper_id ? '' : ''}" as new shipper`}
                  onAddNew={addNewShipper}
                  loading={shipperSearchLoading}
                  onSearchChange={handleShipperSearch}
                  leftIcon={<Truck className="h-4 w-4" />}
                />
                <p className="text-xs text-muted-foreground">
                  Derived from Customer Master. Links via source_customer_id.
                </p>
              </div>

              {/* Consignee */}
              <div className="space-y-2">
                <Label>Consignee <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                <SearchableSelect
                  value={selectedConsignee}
                  onChange={selectConsignee}
                  options={consigneeOptions}
                  placeholder="Search consignee by name or reference…"
                  title="Select Consignee"
                  searchPlaceholder="Search consignee..."
                  showAddButton
                  addButtonText={`Add "${form.consignee_id ? '' : ''}" as new consignee`}
                  onAddNew={addNewConsignee}
                  loading={consigneeSearchLoading}
                  onSearchChange={handleConsigneeSearch}
                  leftIcon={<Package className="h-4 w-4" />}
                />
                <p className="text-xs text-muted-foreground">
                  Derived from Customer Master. Links via source_customer_id.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-5 p-6 sm:p-8">
            <div><h2 className="text-lg font-semibold">Shipment Details</h2><p className="text-sm text-muted-foreground">Define the transport mode and routing.</p></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origin (POL) <span className="text-xs text-muted-foreground font-normal">(Required)</span></Label>
                  <SearchableSelect
                    value={selectedPol}
                    onChange={selectPol}
                    options={polOptions}
                    placeholder="Search POL by name, code, city, UNLOCODE…"
                    title="Select Port of Loading"
                    searchPlaceholder="Search POL..."
                    showAddButton
                    addButtonText={`Add "${form.origin || ''}" as new POL`}
                    onAddNew={addNewPol}
                    loading={polSearchLoading}
                    onSearchChange={handlePolSearch}
                    leftIcon={<MapPin className="h-4 w-4" />}
                  />
                  {form.pol_country && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">POL Country</Label>
                      <Input
                        value={form.pol_country}
                        disabled
                        className="bg-muted/50 cursor-not-allowed"
                        title="Automatically resolved from selected POL"
                      />
                      <p className="text-xs text-muted-foreground">
                        Auto-resolved from POL master
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Destination (POD) <span className="text-xs text-muted-foreground font-normal">(Required)</span></Label>
                  <SearchableSelect
                    value={selectedPod}
                    onChange={selectPod}
                    options={podOptions}
                    placeholder="Search POD by name, code, city, UNLOCODE…"
                    title="Select Port of Discharge"
                    searchPlaceholder="Search POD..."
                    showAddButton
                    addButtonText={`Add "${form.destination || ''}" as new POD`}
                    onAddNew={addNewPod}
                    loading={podSearchLoading}
                    onSearchChange={handlePodSearch}
                    leftIcon={<Globe className="h-4 w-4" />}
                  />
                  {form.pod_country && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">POD Country</Label>
                      <Input
                        value={form.pod_country}
                        disabled
                        className="bg-muted/50 cursor-not-allowed"
                        title="Automatically resolved from selected POD"
                      />
                      <p className="text-xs text-muted-foreground">
                        Auto-resolved from POD master
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shipment Mode</Label>
                  <SearchableSelect
                    value={form.mode ? { id: form.mode, label: modes.find(m => m.value === form.mode)?.label || form.mode } : null}
                    onChange={(opt) => setField('mode', opt?.id || '')}
                    options={modes.map(m => ({ id: m.value, label: m.label }))}
                    placeholder="Select shipment mode"
                    title="Select Shipment Mode"
                    searchPlaceholder="Search mode..."
                    leftIcon={<Ship className="h-4 w-4" />}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Incoterm</Label>
                  <SearchableSelect
                    value={form.incoterm ? { id: form.incoterm, label: form.incoterm } : null}
                    onChange={(opt) => setField('incoterm', opt?.id || '')}
                    options={incoterms.map(t => ({ id: t, label: t }))}
                    placeholder="Select incoterm"
                    title="Select Incoterm"
                    searchPlaceholder="Search incoterm..."
                    leftIcon={<MapPin className="h-4 w-4" />}
                  />
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
            </div>
          </section>

          <section className="space-y-5 p-6 sm:p-8">
            <div><h2 className="text-lg font-semibold">Cargo Details</h2><p className="text-sm text-muted-foreground">Add cargo dimensions and additional instructions.</p></div>
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
                    {shipperOptions.find(s => s.id === form.shipper_id)?.label || (form.shipper_id ? 'Selected' : '—')}
                  </dd>
                  <dt className="text-muted-foreground">Consignee</dt>
                  <dd className="font-medium">
                    {consigneeOptions.find(c => c.id === form.consignee_id)?.label || (form.consignee_id ? 'Selected' : '—')}
                  </dd>
                  <dt className="text-muted-foreground">POL</dt>
                  <dd className="font-medium">
                    {form.origin || '—'}
                    {form.pol_country && <span className="ml-2 text-xs text-muted-foreground">({form.pol_country})</span>}
                  </dd>
                  <dt className="text-muted-foreground">POD</dt>
                  <dd className="font-medium">
                    {form.destination || '—'}
                    {form.pod_country && <span className="ml-2 text-xs text-muted-foreground">({form.pod_country})</span>}
                  </dd>
                  <dt className="text-muted-foreground">Mode</dt>
                  <dd className="font-medium capitalize">{form.mode}</dd>
                  <dt className="text-muted-foreground">Cargo</dt>
                  <dd className="font-medium">{form.cargo_type || '—'}</dd>
                </dl>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="min-w-40">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (enquiry ? 'Update Enquiry' : 'Save Enquiry')}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
}
