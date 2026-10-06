import { supabase } from './client';
import {
  DOCS_BUCKET,
  ENQUIRY_NO_PREFIX,
  ENV_COMPANY_ID,
  ENV_JOB_PREFIX,
} from '@/lib/config';
import { chargeAmountInr } from '@/lib/charges';
import type {
  ChargeRow,
  Company,
  Currency,
  Customer,
  DocType,
  Enquiry,
  EnquiryStatus,
  KycDocument,
  Milestone,
  Mode,
  Port,
  SalesPerson,
  Shipment,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Raw row shapes (only the columns this app reads/writes)
// ---------------------------------------------------------------------------

interface DbCustomer {
  id: number;
  name: string | null;
  address: string | null;
  gst: string | null;
  email: string | null;
}
interface DbDescription {
  description: string | null;
}
interface DbSalesPerson {
  id: number;
  name: string | null;
  is_active: boolean | null;
}
interface DbMode {
  id: number;
  mode_name: string | null;
  mode_code: string | null;
}
interface DbPort {
  id: number;
  country_name: string | null;
  location_name: string | null;
  location_type: string | null;
  code: string | null;
}
interface DbEnquiryChargeRow {
  id: number;
  enquiry_id: number;
  description: string | null;
  quantity: number | null;
  rate: number | null;
  currency: string | null;
  exchange_rate_applied: number | null;
}
interface DbEnquiryRow {
  id: number;
  enquiry_no: string | null;
  enq_date: string | null;
  customer_id: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_gst: string | null;
  shipper: string | null;
  cnee: string | null;
  sales_person_id: number | null;
  seals_person: string | null;
  mode_id: number | null;
  pol_country: string | null;
  pol: string | null;
  pod_country: string | null;
  pod: string | null;
  commodity: string | null;
  packages: string | null;
  packages_unit: string | null;
  gross_weight: string | null;
  gross_weight_unit: string | null;
  cbm: string | null;
  usd_exchange_rate: number | null;
  eur_exchange_rate: number | null;
  gbp_exchange_rate: number | null;
  status: string | null;
  cancel_remark: string | null;
  job_id: number | null;
}
interface DbJobRow {
  id: number;
  job_no: string | null;
  enq_date: string | null;
  customer_name: string | null;
  shipper: string | null;
  cnee: string | null;
  invoice_no: string | null;
  pol: string | null;
  pod: string | null;
  carrier: string | null;
  etd: string | null;
  eta: string | null;
  handover_date: string | null;
  delivery_date: string | null;
  container_no: string | null;
  services: string | null;
  bl_type: string | null;
  status: string | null;
  packages: string | null;
  gross_weight: string | null;
  gross_weight_unit: string | null;
  mode_id: number | null;
  remark: string | null;
  remark_date: string | null;
  hbl_no: string | null;
  mbl_no: string | null;
  sbill_no: string | null;
  sbill_date: string | null;
  boe_no: string | null;
  boe_date: string | null;
  leo_date: string | null;
  physical_delivery_date: string | null;
}
interface DbCustomerDocumentRow {
  id: number;
  customer_id: number;
  doc_type: string;
  doc_label: string | null;
  file_name: string | null;
  expiry_date: string | null;
  uploaded_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Human-readable message for any thrown thing (PostgrestError isn't an Error). */
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { message?: string; details?: string; hint?: string };
    return [e.message, e.details, e.hint].filter(Boolean).join(' — ');
  }
  return String(err);
}

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === '23505';
}

/** Retry when two users race for the same max(id)+1 / next number. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw lastErr;
}

/** Tables have no DB-side sequence on `id`, so allocate max(id)+1. */
async function nextId(table: string): Promise<number> {
  const { data, error } = await supabase.from(table).select('id').order('id', { ascending: false }).limit(1);
  if (error) throw error;
  return data && data.length > 0 ? (data[0] as { id: number }).id + 1 : 1;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customer_master')
    .select('id, name, address, gst, email')
    .order('name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbCustomer[])
    .filter((c) => c.name)
    .map((c) => ({
      id: String(c.id),
      name: c.name as string,
      address: c.address ?? '',
      gst: c.gst ?? '',
      email: c.email ?? '',
    }));
}

export async function fetchDescriptions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('description_master')
    .select('description')
    .order('description', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbDescription[]).map((d) => d.description ?? '').filter(Boolean);
}

export async function fetchSalesPersons(): Promise<SalesPerson[]> {
  const { data, error } = await supabase
    .from('sales_persons')
    .select('id, name, is_active')
    .order('name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbSalesPerson[])
    .filter((s) => s.name && s.is_active !== false)
    .map((s) => ({ id: String(s.id), name: s.name as string }));
}

export async function fetchModes(): Promise<Mode[]> {
  const { data, error } = await supabase
    .from('mode_master')
    .select('id, mode_name, mode_code')
    .order('id', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbMode[])
    .filter((m) => m.mode_name)
    .map((m) => ({ id: String(m.id), name: m.mode_name as string, code: m.mode_code ?? '' }));
}

export async function fetchPorts(): Promise<Port[]> {
  const { data, error } = await supabase
    .from('port_master')
    .select('id, country_name, location_name, location_type, code')
    .order('location_name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbPort[])
    .filter((p) => p.country_name && p.location_name)
    .map((p) => ({
      id: String(p.id),
      country: p.country_name as string,
      name: p.location_name as string,
      type: p.location_type ?? '',
      code: p.code ?? '',
    }));
}

/** Issuing company (for quotation letterhead). Optional: returns null if the
 * `companies` table or row isn't there, so the UI shows nothing rather than fake data. */
export async function fetchCompany(companyId: number | null): Promise<Company | null> {
  if (companyId === null) return null;
  try {
    const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, unknown>;
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = row[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return '';
    };
    return {
      name: pick('name', 'company_name'),
      address: pick('address', 'company_address', 'registered_address'),
      gst: pick('gst', 'gstin', 'gst_no', 'gst_number'),
      email: pick('email', 'company_email'),
      phone: pick('phone', 'mobile', 'contact_no'),
      terms: pick('quotation_terms', 'terms', 'terms_and_conditions'),
    };
  } catch {
    return null;
  }
}

/** company_id used for new enquiries: env override, else whatever existing rows use. */
export async function resolveCompanyId(): Promise<number | null> {
  if (ENV_COMPANY_ID !== null && Number.isFinite(ENV_COMPANY_ID)) return ENV_COMPANY_ID;
  const { data, error } = await supabase
    .from('enquiries')
    .select('company_id')
    .not('company_id', 'is', null)
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw error;
  const v = data && data.length > 0 ? (data[0] as { company_id: number | null }).company_id : null;
  return v ?? null;
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function mapCharge(row: DbEnquiryChargeRow): ChargeRow {
  const currency = ((row.currency as Currency) || 'INR') as Currency;
  return {
    id: String(row.id),
    description: row.description ?? '',
    quantity: toNumber(row.quantity),
    rate: toNumber(row.rate),
    currency,
    exchangeRate: currency === 'INR' ? 1 : toNumber(row.exchange_rate_applied) || 1,
  };
}

function mapEnquiry(
  row: DbEnquiryRow,
  charges: ChargeRow[],
  modeNameById: Map<number, string>,
  jobNoById: Map<number, string>
): Enquiry {
  return {
    id: String(row.id),
    date: row.enq_date ?? '',
    enquiryNo: row.enquiry_no || 'Draft',
    customerId: row.customer_id !== null ? String(row.customer_id) : null,
    customerName: row.customer_name ?? '',
    customerAddress: row.customer_address ?? '',
    customerGst: row.customer_gst ?? '',
    shipper: row.shipper ?? '',
    consignee: row.cnee ?? '',
    modeId: row.mode_id !== null ? String(row.mode_id) : null,
    mode: (row.mode_id !== null ? modeNameById.get(row.mode_id) : undefined) ?? '',
    polCountry: row.pol_country ?? '',
    polPort: row.pol ?? '',
    podCountry: row.pod_country ?? '',
    podPort: row.pod ?? '',
    commodity: row.commodity ?? '',
    packages: toNumber(row.packages),
    packageUnit: row.packages_unit ?? '',
    grossWeight: toNumber(row.gross_weight),
    weightUnit: row.gross_weight_unit ?? '',
    cbm: toNumber(row.cbm),
    salesPersonId: row.sales_person_id !== null ? String(row.sales_person_id) : null,
    salesPerson: row.seals_person ?? '',
    status: ((row.status as EnquiryStatus) || 'Pending') as EnquiryStatus,
    linkedJobNo: row.job_id ? jobNoById.get(row.job_id) ?? null : null,
    cancellationRemark: row.cancel_remark ?? undefined,
    charges,
    rates: {
      usd: toNumber(row.usd_exchange_rate),
      eur: toNumber(row.eur_exchange_rate),
      gbp: toNumber(row.gbp_exchange_rate),
    },
  };
}

function deriveMilestone(row: DbJobRow): Milestone {
  if (row.physical_delivery_date || row.delivery_date) return 'Delivered';
  if (row.handover_date) return 'Handover';
  if (row.boe_date || row.sbill_date || row.leo_date) return 'Customs Cleared';
  return 'Booked';
}

function mapJob(row: DbJobRow, modeNameById: Map<number, string>): Shipment {
  return {
    id: String(row.id),
    jobNo: row.job_no ?? '',
    date: row.enq_date ?? '',
    customerName: row.customer_name ?? '',
    invoiceNo: row.invoice_no ?? '',
    shipper: row.shipper ?? '',
    consignee: row.cnee ?? '',
    mode: (row.mode_id !== null ? modeNameById.get(row.mode_id) : undefined) ?? '',
    carrier: row.carrier ?? '',
    pol: row.pol ?? '',
    pod: row.pod ?? '',
    containerNos: row.container_no ?? '',
    hbl: row.hbl_no ?? '',
    mbl: row.mbl_no ?? '',
    sbillOrBoeNo: row.sbill_no ?? row.boe_no ?? '',
    sbillOrBoeDate: row.sbill_date ?? row.boe_date ?? '',
    leoDate: row.leo_date,
    etd: row.etd,
    eta: row.eta,
    handoverDate: row.handover_date,
    deliveryDate: row.delivery_date,
    blType: row.bl_type ?? (row.hbl_no ? 'HBL' : row.mbl_no ? 'MBL' : ''),
    services: row.services ?? '',
    packages: toNumber(row.packages),
    grossWeight: toNumber(row.gross_weight),
    weightUnit: row.gross_weight_unit ?? '',
    remark: row.remark ?? '',
    remarkDate: row.remark_date,
    milestone: deriveMilestone(row),
    status: row.status === 'Completed' ? 'Completed' : 'Active',
  };
}

/** file_name stores "<customerId>/<timestamp>_<original name>" for uploaded files. */
function splitStoredFile(stored: string | null): { fileName: string | null; filePath: string | null } {
  if (!stored) return { fileName: null, filePath: null };
  const slash = stored.indexOf('/');
  if (slash === -1) return { fileName: stored, filePath: null }; // legacy: name only
  return { fileName: stored.slice(slash + 1).replace(/^\d+_/, ''), filePath: stored };
}

function mapDocument(row: DbCustomerDocumentRow, customerNameById: Map<number, string>): KycDocument {
  const { fileName, filePath } = splitStoredFile(row.file_name);
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    customerName: customerNameById.get(row.customer_id) ?? '',
    docType: row.doc_type as DocType,
    docNumber: row.doc_label ?? '',
    fileName,
    filePath,
    uploadDate: row.uploaded_at ? row.uploaded_at.slice(0, 10) : null,
    expiryDate: row.expiry_date,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const ENQUIRY_COLUMNS =
  'id, enquiry_no, enq_date, customer_id, customer_name, customer_address, customer_gst, shipper, cnee, sales_person_id, seals_person, mode_id, pol_country, pol, pod_country, pod, commodity, packages, packages_unit, gross_weight, gross_weight_unit, cbm, usd_exchange_rate, eur_exchange_rate, gbp_exchange_rate, status, cancel_remark, job_id';

export async function fetchEnquiries(
  modeNameById: Map<number, string>,
  jobNoById: Map<number, string>
): Promise<Enquiry[]> {
  const [enq, chg] = await Promise.all([
    supabase.from('enquiries').select(ENQUIRY_COLUMNS).order('id', { ascending: false }),
    supabase
      .from('enquiry_charges')
      .select('id, enquiry_id, description, quantity, rate, currency, exchange_rate_applied')
      .order('id', { ascending: true }),
  ]);
  if (enq.error) throw enq.error;
  if (chg.error) throw chg.error;

  const byEnquiry = new Map<number, ChargeRow[]>();
  for (const c of (chg.data ?? []) as DbEnquiryChargeRow[]) {
    const list = byEnquiry.get(c.enquiry_id) ?? [];
    list.push(mapCharge(c));
    byEnquiry.set(c.enquiry_id, list);
  }
  return ((enq.data ?? []) as unknown as DbEnquiryRow[]).map((row) =>
    mapEnquiry(row, byEnquiry.get(row.id) ?? [], modeNameById, jobNoById)
  );
}

export async function fetchJobs(modeNameById: Map<number, string>): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id, job_no, enq_date, customer_name, shipper, cnee, invoice_no, pol, pod, carrier, etd, eta, handover_date, delivery_date, container_no, services, bl_type, status, packages, gross_weight, gross_weight_unit, mode_id, remark, remark_date, hbl_no, mbl_no, sbill_no, sbill_date, boe_no, boe_date, leo_date, physical_delivery_date'
    )
    .order('id', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as DbJobRow[]).map((row) => mapJob(row, modeNameById));
}

export async function fetchDocuments(customerNameById: Map<number, string>): Promise<KycDocument[]> {
  const { data, error } = await supabase
    .from('customer_documents')
    .select('id, customer_id, doc_type, doc_label, file_name, expiry_date, uploaded_at')
    .order('id', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DbCustomerDocumentRow[]).map((row) => mapDocument(row, customerNameById));
}

// ---------------------------------------------------------------------------
// Numbering (derived from the database, not from whatever is loaded in the UI)
// ---------------------------------------------------------------------------

function maxSuffix(values: (string | null)[], re: RegExp): number {
  let max = 0;
  for (const v of values) {
    const m = v ? re.exec(v) : null;
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export async function nextEnquiryNo(): Promise<string> {
  const { data, error } = await supabase
    .from('enquiries')
    .select('enquiry_no')
    .like('enquiry_no', `${ENQUIRY_NO_PREFIX}-%`);
  if (error) throw error;
  const re = new RegExp(`^${ENQUIRY_NO_PREFIX}-(\\d+)$`);
  const max = maxSuffix(((data ?? []) as { enquiry_no: string | null }[]).map((r) => r.enquiry_no), re);
  return `${ENQUIRY_NO_PREFIX}-${String(max + 1).padStart(4, '0')}`;
}

async function resolveJobPrefix(): Promise<string> {
  if (ENV_JOB_PREFIX) return ENV_JOB_PREFIX;
  const { data, error } = await supabase
    .from('jobs')
    .select('job_no')
    .not('job_no', 'is', null)
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw error;
  const sample = data && data.length > 0 ? (data[0] as { job_no: string | null }).job_no : null;
  const prefix = sample?.split('/')[0];
  if (!prefix) {
    throw new Error('Cannot determine job number prefix. Set NEXT_PUBLIC_JOB_PREFIX in .env.local.');
  }
  return prefix;
}

/** e.g. BONLOG/AE/26-27/031 — prefix from existing jobs, code from mode_master, FY from today. */
export async function nextJobNo(modeCode: string, fiscalYear: string): Promise<string> {
  if (!modeCode) throw new Error('This mode has no mode_code in mode_master, so a job number cannot be generated.');
  const prefix = await resolveJobPrefix();
  const stem = `${prefix}/${modeCode}/${fiscalYear}/`;
  const { data, error } = await supabase.from('jobs').select('job_no').like('job_no', `${stem}%`);
  if (error) throw error;
  const escaped = stem.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const max = maxSuffix(((data ?? []) as { job_no: string | null }[]).map((r) => r.job_no), new RegExp(`^${escaped}(\\d+)$`));
  return `${stem}${String(max + 1).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Enquiry writes
// ---------------------------------------------------------------------------

export interface EnquiryWrite {
  date?: string;
  customerId: number;
  customerName: string;
  customerAddress: string;
  customerGst: string;
  shipper: string;
  consignee: string;
  modeId: number;
  polCountry: string;
  polPort: string;
  podCountry: string;
  podPort: string;
  commodity: string;
  packages: number;
  packageUnit: string;
  grossWeight: number;
  weightUnit: string;
  cbm: number;
  salesPersonId: number;
  salesPersonName: string;
  usdRate: number;
  eurRate: number;
  gbpRate: number;
  charges: ChargeRow[];
}

function enquiryColumns(w: EnquiryWrite) {
  return {
    customer_id: w.customerId,
    customer_name: w.customerName,
    customer_address: w.customerAddress,
    customer_gst: w.customerGst,
    shipper: w.shipper,
    cnee: w.consignee,
    sales_person_id: w.salesPersonId,
    seals_person: w.salesPersonName,
    mode_id: w.modeId,
    pol_country: w.polCountry,
    pol: w.polPort,
    pod_country: w.podCountry,
    pod: w.podPort,
    commodity: w.commodity,
    packages: String(w.packages),
    packages_unit: w.packageUnit,
    gross_weight: String(w.grossWeight),
    gross_weight_unit: w.weightUnit,
    cbm: String(w.cbm),
    usd_exchange_rate: w.usdRate,
    eur_exchange_rate: w.eurRate,
    gbp_exchange_rate: w.gbpRate,
  };
}

async function insertCharges(enquiryId: number, charges: ChargeRow[]): Promise<void> {
  if (charges.length === 0) return;
  await withRetry(async () => {
    let id = await nextId('enquiry_charges');
    const rows = charges.map((ch) => ({
      id: id++,
      enquiry_id: enquiryId,
      description: ch.description,
      quantity: ch.quantity,
      rate: ch.rate,
      currency: ch.currency,
      exchange_rate_applied: ch.currency === 'INR' ? 1 : ch.exchangeRate,
      amount: ch.quantity * ch.rate,
      amount_inr: chargeAmountInr(ch),
    }));
    const { error } = await supabase.from('enquiry_charges').insert(rows);
    if (error) throw error;
  });
}

export async function insertEnquiry(w: EnquiryWrite & { date: string; companyId: number }): Promise<number> {
  const id = await withRetry(async () => {
    const newId = await nextId('enquiries');
    const { error } = await supabase.from('enquiries').insert({
      id: newId,
      enquiry_no: null,
      company_id: w.companyId,
      enq_date: w.date,
      status: 'Pending',
      ...enquiryColumns(w),
    });
    if (error) throw error;
    return newId;
  });
  try {
    await insertCharges(id, w.charges);
  } catch (err) {
    // Don't leave a charge-less orphan behind.
    await supabase.from('enquiries').delete().eq('id', id);
    throw err;
  }
  return id;
}

export async function updateEnquiryDb(id: number, w: EnquiryWrite): Promise<void> {
  const { error } = await supabase.from('enquiries').update(enquiryColumns(w)).eq('id', id);
  if (error) throw error;
  const { error: delError } = await supabase.from('enquiry_charges').delete().eq('enquiry_id', id);
  if (delError) throw delError;
  await insertCharges(id, w.charges);
}


export async function confirmEnquiryAndCreateJob(args: {
  enquiry: Enquiry;
  modeCode: string;
  fiscalYear: string;
}): Promise<{ jobId: number; jobNo: string; enquiryNo: string }> {
  const { enquiry } = args;
  const { jobId, jobNo } = await withRetry(async () => {
    const [newJobId, newJobNo] = await Promise.all([nextId('jobs'), nextJobNo(args.modeCode, args.fiscalYear)]);
    const { error } = await supabase.from('jobs').insert({
      id: newJobId,
      job_no: newJobNo,
      enq_date: enquiry.date,
      customer_name: enquiry.customerName,
      customer_id: enquiry.customerId ? Number(enquiry.customerId) : null,
      shipper: enquiry.shipper,
      cnee: enquiry.consignee,
      pol: enquiry.polPort,
      pol_country: enquiry.polCountry,
      pod: enquiry.podPort,
      pod_country: enquiry.podCountry,
      commodity: enquiry.commodity,
      packages: String(enquiry.packages),
      packages_unit: enquiry.packageUnit,
      gross_weight: String(enquiry.grossWeight),
      gross_weight_unit: enquiry.weightUnit,
      mode_id: enquiry.modeId ? Number(enquiry.modeId) : null,
      sales_person_id: enquiry.salesPersonId ? Number(enquiry.salesPersonId) : null,
      status: 'Active',
      enquiry_id: Number(enquiry.id),
    });
    if (error) throw error;
    return { jobId: newJobId, jobNo: newJobNo };
  });

  try {
    const enquiryNo = await withRetry(async () => {
      const no = await nextEnquiryNo();
      const { error } = await supabase
        .from('enquiries')
        .update({ status: 'Confirmed', enquiry_no: no, job_id: jobId })
        .eq('id', Number(enquiry.id));
      if (error) throw error;
      return no;
    });
    return { jobId, jobNo, enquiryNo };
  } catch (err) {
    // Roll back the job so we never have a job whose enquiry is still Pending.
    await supabase.from('jobs').delete().eq('id', jobId);
    throw err;
  }
}

export async function cancelEnquiryDb(id: number, remark: string): Promise<void> {
  const { error } = await supabase.from('enquiries').update({ status: 'Cancelled', cancel_remark: remark }).eq('id', id);
  if (error) throw error;
}

export async function updateJobRemark(id: number, remark: string, remarkDate: string | null): Promise<void> {
  const { error } = await supabase.from('jobs').update({ remark, remark_date: remarkDate }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Documents (rows + Storage)
// ---------------------------------------------------------------------------

function safeName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_');
}

export async function uploadDocumentFile(customerId: number, file: File): Promise<string> {
  const path = `${customerId}/${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    throw new Error(
      `${error.message}. Make sure the "${DOCS_BUCKET}" storage bucket exists and allows uploads (see supabase/setup.sql).`
    );
  }
  return path;
}

export async function removeDocumentFile(path: string | null): Promise<void> {
  if (!path) return;
  await supabase.storage.from(DOCS_BUCKET).remove([path]);
}

export async function getDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 60 * 5);
  if (error || !data) throw error ?? new Error('Could not create download link');
  return data.signedUrl;
}

export interface DocumentWrite {
  customerId: number;
  docType: DocType;
  docNumber: string;
  expiryDate: string | null;
  /** Value for the file_name column ("" when no file). */
  storedFile: string;
}

export async function insertDocument(w: DocumentWrite): Promise<number> {
  return withRetry(async () => {
    const id = await nextId('customer_documents');
    const { error } = await supabase.from('customer_documents').insert({
      id,
      customer_id: w.customerId,
      doc_type: w.docType,
      doc_label: w.docNumber,
      file_name: w.storedFile,
      expiry_date: w.expiryDate,
      uploaded_at: new Date().toISOString(),
    });
    if (error) throw error;
    return id;
  });
}

export async function updateDocumentDb(id: number, w: Partial<DocumentWrite>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (w.customerId !== undefined) patch.customer_id = w.customerId;
  if (w.docType !== undefined) patch.doc_type = w.docType;
  if (w.docNumber !== undefined) patch.doc_label = w.docNumber;
  if (w.storedFile !== undefined) patch.file_name = w.storedFile;
  if (w.expiryDate !== undefined) patch.expiry_date = w.expiryDate;
  const { error } = await supabase.from('customer_documents').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteDocumentDb(id: number): Promise<void> {
  const { error } = await supabase.from('customer_documents').delete().eq('id', id);
  if (error) throw error;
}
