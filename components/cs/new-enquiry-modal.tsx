'use client';

import * as React from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCs } from '@/lib/cs-store';
import { errorMessage } from '@/lib/supabase/queries';
import { CURRENCIES, PACKAGE_UNITS, WEIGHT_UNITS } from '@/lib/config';
import { chargeAmountInr, formatInr } from '@/lib/charges';
import type { ChargeRow, Currency, Enquiry, EnquiryInput, Port } from '@/lib/types';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Options list that always contains the currently-selected value (legacy rows). */
function withCurrent(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

interface FormChargeRow {
  id: string;
  description: string;
  quantity: string;
  rate: string;
  currency: Currency;
  exchangeRate: string;
}

interface FormState {
  customerId: string;
  modeId: string;
  shipper: string;
  consignee: string;
  polCountry: string;
  polPort: string;
  podCountry: string;
  podPort: string;
  commodity: string;
  salesPersonId: string;
  packages: string;
  packageUnit: string;
  cbm: string;
  grossWeight: string;
  weightUnit: string;
  usd: string;
  eur: string;
  gbp: string;
  charges: FormChargeRow[];
}

const numStr = (n: number | undefined | null) => (n ? String(n) : '');
const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the sheet edits this (Pending) enquiry instead of creating one. */
  enquiry?: Enquiry | null;
}

export function NewEnquiryModal({ open, onOpenChange, enquiry }: Props) {
  const {
    addEnquiry,
    updateEnquiry,
    customers,
    salesPeople,
    modes,
    ports,
    chargeDescriptions,
    latestRates,
    currentUser,
  } = useCs();
  const { toast } = useToast();
  const editing = !!enquiry;

  const [form, setForm] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const blankCharge = React.useCallback(
    (description = ''): FormChargeRow => ({
      id: uid(),
      description,
      quantity: '1',
      rate: '',
      currency: 'INR',
      exchangeRate: '1',
    }),
    []
  );

  // (Re)initialise whenever the sheet opens.
  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);

    if (enquiry) {
      const customerId =
        enquiry.customerId ?? customers.find((c) => c.name === enquiry.customerName)?.id ?? '';
      const salesPersonId =
        enquiry.salesPersonId ?? salesPeople.find((s) => s.name === enquiry.salesPerson)?.id ?? '';
      setForm({
        customerId,
        modeId: enquiry.modeId ?? modes.find((m) => m.name === enquiry.mode)?.id ?? '',
        shipper: enquiry.shipper,
        consignee: enquiry.consignee,
        polCountry: enquiry.polCountry,
        polPort: enquiry.polPort,
        podCountry: enquiry.podCountry,
        podPort: enquiry.podPort,
        commodity: enquiry.commodity,
        salesPersonId,
        packages: numStr(enquiry.packages),
        packageUnit: enquiry.packageUnit,
        cbm: numStr(enquiry.cbm),
        grossWeight: numStr(enquiry.grossWeight),
        weightUnit: enquiry.weightUnit,
        usd: numStr(enquiry.rates.usd),
        eur: numStr(enquiry.rates.eur),
        gbp: numStr(enquiry.rates.gbp),
        charges: enquiry.charges.map((c) => ({
          id: uid(),
          description: c.description,
          quantity: String(c.quantity),
          rate: String(c.rate),
          currency: c.currency,
          exchangeRate: String(c.exchangeRate),
        })),
      });
    } else {
      setForm({
        customerId: '',
        modeId: '',
        shipper: '',
        consignee: '',
        polCountry: '',
        polPort: '',
        podCountry: '',
        podPort: '',
        commodity: '',
        salesPersonId: currentUser?.id ?? '',
        packages: '1',
        packageUnit: '',
        cbm: '',
        grossWeight: '',
        weightUnit: '',
        usd: numStr(latestRates?.usd),
        eur: numStr(latestRates?.eur),
        gbp: numStr(latestRates?.gbp),
        charges: [blankCharge()],
      });
    }
    // Only re-init on open / target change, not on every store refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, enquiry?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _drop, ...rest } = e;
      return rest;
    });
  };

  // --- ports -------------------------------------------------------------
  const modeName = modes.find((m) => m.id === form?.modeId)?.name ?? '';
  const countries = React.useMemo(() => Array.from(new Set(ports.map((p) => p.country))).sort(), [ports]);

  const portOptions = React.useCallback(
    (country: string, current: string): string[] => {
      if (!country) return withCurrent([], current);
      const inCountry = ports.filter((p) => p.country === country);
      const isAir = /air/i.test(modeName);
      const isSea = /sea/i.test(modeName);
      const byType = (p: Port) => (isAir ? /air/i.test(p.type) : isSea ? !/air/i.test(p.type) : true);
      const typed = inCountry.filter(byType);
      const source = typed.length > 0 ? typed : inCountry;
      return withCurrent(Array.from(new Set(source.map((p) => p.name))).sort(), current);
    },
    [ports, modeName]
  );

  // --- charges -----------------------------------------------------------
  const setRate = (cur: 'USD' | 'EUR' | 'GBP', value: string) => {
    setForm((f) =>
      f
        ? {
            ...f,
            [cur.toLowerCase()]: value,
            // keep rows in that currency in sync with the header rate
            charges: f.charges.map((c) => (c.currency === cur ? { ...c, exchangeRate: value } : c)),
          }
        : f
    );
  };

  const updateCharge = (id: string, patch: Partial<FormChargeRow>) => {
    setForm((f) => {
      if (!f) return f;
      return {
        ...f,
        charges: f.charges.map((c) => {
          if (c.id !== id) return c;
          const next = { ...c, ...patch };
          if (patch.currency) {
            next.exchangeRate =
              patch.currency === 'INR'
                ? '1'
                : patch.currency === 'USD'
                  ? f.usd
                  : patch.currency === 'EUR'
                    ? f.eur
                    : f.gbp;
          }
          return next;
        }),
      };
    });
    setErrors((e) => {
      const { charges: _c, ...rest } = e;
      return rest;
    });
  };

  const total = React.useMemo(() => {
    if (!form) return 0;
    return form.charges.reduce((sum, c) => {
      const q = toNum(c.quantity);
      const r = toNum(c.rate);
      const x = c.currency === 'INR' ? 1 : toNum(c.exchangeRate);
      if (![q, r, x].every(Number.isFinite)) return sum;
      return sum + chargeAmountInr({ quantity: q, rate: r, currency: c.currency, exchangeRate: x });
    }, 0);
  }, [form]);

  // --- validation + save -------------------------------------------------
  const validate = (f: FormState): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!f.customerId) e.customerId = 'Select a customer';
    if (!f.modeId) e.modeId = 'Select a mode';
    if (!f.polCountry) e.polCountry = 'Select a country';
    if (!f.polPort) e.polPort = 'Select a port';
    if (!f.podCountry) e.podCountry = 'Select a country';
    if (!f.podPort) e.podPort = 'Select a port';
    if (!f.commodity.trim()) e.commodity = 'Enter the commodity';
    if (!f.salesPersonId) e.salesPersonId = 'Select a sales person';
    if (!(toNum(f.packages) > 0)) e.packages = 'Must be greater than 0';
    if (!f.packageUnit) e.packageUnit = 'Select a unit';
    if (!(toNum(f.grossWeight) > 0)) e.grossWeight = 'Must be greater than 0';
    if (!f.weightUnit) e.weightUnit = 'Select a unit';
    if (f.cbm.trim() !== '' && !(toNum(f.cbm) >= 0)) e.cbm = 'Invalid CBM';

    const used = new Set(f.charges.map((c) => c.currency));
    (['USD', 'EUR', 'GBP'] as const).forEach((cur) => {
      if (used.has(cur) && !(toNum(rateOf2(f, cur)) > 0)) e[cur.toLowerCase()] = `Enter ${cur} → INR rate`;
    });

    if (f.charges.length === 0) e.charges = 'Add at least one charge';
    else if (
      f.charges.some(
        (c) =>
          !c.description ||
          !(toNum(c.quantity) > 0) ||
          !(toNum(c.rate) > 0) ||
          (c.currency !== 'INR' && !(toNum(c.exchangeRate) > 0))
      )
    ) {
      e.charges = 'Every charge needs a description, quantity > 0, rate > 0 (and an exchange rate for foreign currencies)';
    }
    return e;
  };
  const rateOf2 = (f: FormState, cur: 'USD' | 'EUR' | 'GBP') => (cur === 'USD' ? f.usd : cur === 'EUR' ? f.eur : f.gbp);

  const handleSave = async () => {
    if (!form) return;
    const e = validate(form);
    setErrors(e);
    setSubmitError(null);
    if (Object.keys(e).length > 0) return;

    const charges: ChargeRow[] = form.charges.map((c) => ({
      id: c.id,
      description: c.description,
      quantity: Number(c.quantity),
      rate: Number(c.rate),
      currency: c.currency,
      exchangeRate: c.currency === 'INR' ? 1 : Number(c.exchangeRate),
    }));
    const input: EnquiryInput = {
      customerId: form.customerId,
      shipper: form.shipper.trim(),
      consignee: form.consignee.trim(),
      modeId: form.modeId,
      polCountry: form.polCountry,
      polPort: form.polPort,
      podCountry: form.podCountry,
      podPort: form.podPort,
      commodity: form.commodity.trim(),
      packages: Number(form.packages),
      packageUnit: form.packageUnit,
      grossWeight: Number(form.grossWeight),
      weightUnit: form.weightUnit,
      cbm: form.cbm.trim() === '' ? 0 : Number(form.cbm),
      salesPersonId: form.salesPersonId,
      rates: { usd: Number(form.usd) || 0, eur: Number(form.eur) || 0, gbp: Number(form.gbp) || 0 },
      charges,
    };

    setSaving(true);
    try {
      if (enquiry) await updateEnquiry(enquiry.id, input);
      else await addEnquiry(input);
      toast({
        title: enquiry ? 'Enquiry updated' : 'Enquiry saved as draft',
        description: enquiry ? `${enquiry.enquiryNo} was updated.` : 'It will get an enquiry number when confirmed.',
      });
      onOpenChange(false);
    } catch (err) {
      const msg = errorMessage(err);
      setSubmitError(msg);
      toast({ title: 'Could not save enquiry', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const labelClass = 'text-xs font-semibold text-slate-600';
  const inputGap = 'space-y-1.5';
  const err = (k: string) => (errors[k] ? <p className="text-xs font-medium text-rose-600">{errors[k]}</p> : null);
  const bad = (k: string) => (errors[k] ? 'border-rose-300 focus:ring-rose-100' : '');

  const emptyHint = (list: unknown[], what: string) =>
    list.length === 0 ? <p className="text-xs text-amber-600">No {what} found in the database.</p> : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-slate-200 px-6 py-4">
          <SheetTitle className="font-heading text-lg font-bold text-slate-900">
            {editing ? `Edit Enquiry${enquiry?.enquiryNo && enquiry.enquiryNo !== 'Draft' ? ` — ${enquiry.enquiryNo}` : ''}` : 'New Enquiry'}
          </SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            {editing ? 'Update shipment details and the charge breakdown' : 'Create a new freight enquiry with charge breakdown'}
          </SheetDescription>
        </SheetHeader>

        {form && (
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="space-y-6 px-6 py-5">
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                  Shipment Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className={inputGap}>
                    <Label className={labelClass}>Customer *</Label>
                    <Select value={form.customerId} onValueChange={(v) => set('customerId', v)}>
                      <SelectTrigger className={bad('customerId')}><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('customerId')}
                    {emptyHint(customers, 'customers')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>Mode *</Label>
                    <Select value={form.modeId} onValueChange={(v) => set('modeId', v)}>
                      <SelectTrigger className={bad('modeId')}><SelectValue placeholder="Select mode" /></SelectTrigger>
                      <SelectContent>
                        {modes.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('modeId')}
                    {emptyHint(modes, 'modes')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>Shipper</Label>
                    <Input value={form.shipper} onChange={(e) => set('shipper', e.target.value)} placeholder="Shipper name" />
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>Consignee</Label>
                    <Input value={form.consignee} onChange={(e) => set('consignee', e.target.value)} placeholder="Consignee name" />
                  </div>

                  <div className={inputGap}>
                    <Label className={labelClass}>POL Country *</Label>
                    <Select
                      value={form.polCountry}
                      onValueChange={(v) => setForm((f) => (f ? { ...f, polCountry: v, polPort: '' } : f))}
                    >
                      <SelectTrigger className={bad('polCountry')}><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {withCurrent(countries, form.polCountry).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('polCountry')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>POL Port *</Label>
                    <Select value={form.polPort} onValueChange={(v) => set('polPort', v)} disabled={!form.polCountry}>
                      <SelectTrigger className={bad('polPort')}>
                        <SelectValue placeholder={form.polCountry ? 'Select port' : 'Pick a country first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {portOptions(form.polCountry, form.polPort).map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('polPort')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>POD Country *</Label>
                    <Select
                      value={form.podCountry}
                      onValueChange={(v) => setForm((f) => (f ? { ...f, podCountry: v, podPort: '' } : f))}
                    >
                      <SelectTrigger className={bad('podCountry')}><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>
                        {withCurrent(countries, form.podCountry).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('podCountry')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>POD Port *</Label>
                    <Select value={form.podPort} onValueChange={(v) => set('podPort', v)} disabled={!form.podCountry}>
                      <SelectTrigger className={bad('podPort')}>
                        <SelectValue placeholder={form.podCountry ? 'Select port' : 'Pick a country first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {portOptions(form.podCountry, form.podPort).map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('podPort')}
                  </div>

                  <div className={inputGap}>
                    <Label className={labelClass}>Commodity *</Label>
                    <Input
                      value={form.commodity}
                      onChange={(e) => set('commodity', e.target.value)}
                      placeholder="Commodity description"
                      className={bad('commodity')}
                    />
                    {err('commodity')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>Sales Person *</Label>
                    <Select value={form.salesPersonId} onValueChange={(v) => set('salesPersonId', v)}>
                      <SelectTrigger className={bad('salesPersonId')}><SelectValue placeholder="Select sales person" /></SelectTrigger>
                      <SelectContent>
                        {salesPeople.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('salesPersonId')}
                    {emptyHint(salesPeople, 'sales persons')}
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
                  Cargo Information
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className={inputGap}>
                    <Label className={labelClass}>Packages *</Label>
                    <Input type="number" min={0} value={form.packages} onChange={(e) => set('packages', e.target.value)} className={bad('packages')} />
                    {err('packages')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>Package Unit *</Label>
                    <Select value={form.packageUnit} onValueChange={(v) => set('packageUnit', v)}>
                      <SelectTrigger className={bad('packageUnit')}><SelectValue placeholder="Select unit" /></SelectTrigger>
                      <SelectContent>
                        {withCurrent(PACKAGE_UNITS, form.packageUnit).map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('packageUnit')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>CBM</Label>
                    <Input type="number" min={0} step="0.01" value={form.cbm} onChange={(e) => set('cbm', e.target.value)} className={bad('cbm')} />
                    {err('cbm')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>Gross Weight *</Label>
                    <Input type="number" min={0} step="0.01" value={form.grossWeight} onChange={(e) => set('grossWeight', e.target.value)} className={bad('grossWeight')} />
                    {err('grossWeight')}
                  </div>
                  <div className={inputGap}>
                    <Label className={labelClass}>Weight Unit *</Label>
                    <Select value={form.weightUnit} onValueChange={(v) => set('weightUnit', v)}>
                      <SelectTrigger className={bad('weightUnit')}><SelectValue placeholder="Select unit" /></SelectTrigger>
                      <SelectContent>
                        {withCurrent(WEIGHT_UNITS, form.weightUnit).map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err('weightUnit')}
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span>
                  Exchange Rates (to INR)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {(['USD', 'EUR', 'GBP'] as const).map((cur) => {
                    const key = cur.toLowerCase() as 'usd' | 'eur' | 'gbp';
                    return (
                      <div key={cur} className={inputGap}>
                        <Label className={labelClass}>{cur} → INR</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={form[key]}
                          onChange={(e) => setRate(cur, e.target.value)}
                          className={bad(key)}
                        />
                        {err(key)}
                      </div>
                    );
                  })}
                </div>
                {!latestRates && !editing && (
                  <p className="text-xs text-slate-500">No previous enquiry to copy rates from — enter today&apos;s rates for any foreign currency you use.</p>
                )}
              </section>

              <Separator />

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">4</span>
                    Charges Table
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setForm((f) => (f ? { ...f, charges: [...f.charges, blankCharge()] } : f))}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Row
                  </Button>
                </div>
                {err('charges')}
                {emptyHint(chargeDescriptions, 'charge descriptions')}

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Description</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">Rate</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Ccy</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">Ex Rate</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">Amount (INR)</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.charges.map((ch) => {
                        const q = toNum(ch.quantity);
                        const r = toNum(ch.rate);
                        const x = ch.currency === 'INR' ? 1 : toNum(ch.exchangeRate);
                        const amt = [q, r, x].every(Number.isFinite)
                          ? chargeAmountInr({ quantity: q, rate: r, currency: ch.currency, exchangeRate: x })
                          : 0;
                        return (
                          <tr key={ch.id}>
                            <td className="px-3 py-2">
                              <Select value={ch.description} onValueChange={(v) => updateCharge(ch.id, { description: v })}>
                                <SelectTrigger className="h-8 min-w-[150px]"><SelectValue placeholder="Select charge" /></SelectTrigger>
                                <SelectContent>
                                  {withCurrent(chargeDescriptions, ch.description).map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" min={0} className="h-8 w-16 text-right" value={ch.quantity} onChange={(e) => updateCharge(ch.id, { quantity: e.target.value })} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" min={0} step="0.01" className="h-8 w-24 text-right" value={ch.rate} onChange={(e) => updateCharge(ch.id, { rate: e.target.value })} />
                            </td>
                            <td className="px-3 py-2">
                              <Select value={ch.currency} onValueChange={(v) => updateCharge(ch.id, { currency: v as Currency })}>
                                <SelectTrigger className="h-8 w-20 justify-center"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CURRENCIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="h-8 w-20 text-right"
                                value={ch.currency === 'INR' ? '1' : ch.exchangeRate}
                                onChange={(e) => updateCharge(ch.id, { exchangeRate: e.target.value })}
                                disabled={ch.currency === 'INR'}
                              />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-800">{formatInr(amt)}</td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                aria-label="Remove charge"
                                onClick={() => setForm((f) => (f ? { ...f, charges: f.charges.filter((c) => c.id !== ch.id) } : f))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-blue-50">
                        <td colSpan={5} className="px-3 py-2.5 text-right font-bold text-slate-800">Total</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-blue-700">{formatInr(total)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              {submitError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{submitError}</div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !form} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? 'Save Changes' : 'Save as Draft'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
