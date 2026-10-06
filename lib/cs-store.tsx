'use client';

import * as React from 'react';
import type {
  Company,
  Customer,
  DocType,
  Enquiry,
  EnquiryInput,
  ExchangeRates,
  KycDocument,
  Mode,
  Port,
  SalesPerson,
  Shipment,
} from './types';
import { fiscalYearLabel, todayISO } from './date';
import {
  cancelEnquiryDb,
  confirmEnquiryAndCreateJob,
  deleteDocumentDb,
  errorMessage,
  fetchCompany,
  fetchCustomers,
  fetchDescriptions,
  fetchDocuments,
  fetchEnquiries,
  fetchJobs,
  fetchModes,
  fetchPorts,
  fetchSalesPersons,
  getDocumentUrl,
  insertDocument,
  insertEnquiry,
  removeDocumentFile,
  resolveCompanyId,
  updateDocumentDb,
  updateEnquiryDb,
  updateJobRemark,
  uploadDocumentFile,
  type EnquiryWrite,
} from './supabase/queries';

export interface DocumentInput {
  customerId: string;
  docType: DocType;
  docNumber: string;
  expiryDate: string | null;
  /** New file to upload (null/undefined = keep whatever is stored). */
  file?: File | null;
}

interface CsState {
  loading: boolean;
  /** Fatal load failure (network, bad key, missing table...). */
  loadError: string | null;
  /** Connected but suspicious (e.g. every master table empty => RLS?). */
  warning: string | null;
  reload: () => Promise<void>;

  enquiries: Enquiry[];
  shipments: Shipment[];
  documents: KycDocument[];
  customers: Customer[];
  salesPeople: SalesPerson[];
  modes: Mode[];
  ports: Port[];
  chargeDescriptions: string[];
  company: Company | null;
  /** Exchange rates used on the most recent enquiry — default for the next one. */
  latestRates: ExchangeRates | null;

  currentUser: SalesPerson | null;
  setCurrentUserId: (id: string | null) => void;

  addEnquiry: (input: EnquiryInput) => Promise<void>;
  updateEnquiry: (id: string, input: EnquiryInput) => Promise<void>;
  confirmEnquiry: (id: string) => Promise<{ enquiryNo: string; jobNo: string }>;
  cancelEnquiry: (id: string, remark: string) => Promise<void>;
  updateShipmentRemark: (id: string, remark: string, remarkDate: string | null) => Promise<void>;
  addDocument: (input: DocumentInput) => Promise<void>;
  updateDocument: (id: string, input: DocumentInput) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  openDocumentFile: (doc: KycDocument) => Promise<void>;
}

const CsContext = React.createContext<CsState | null>(null);
const USER_KEY = 'cs.currentSalesPersonId';

export function CsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);

  const [enquiries, setEnquiries] = React.useState<Enquiry[]>([]);
  const [shipments, setShipments] = React.useState<Shipment[]>([]);
  const [documents, setDocuments] = React.useState<KycDocument[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [salesPeople, setSalesPeople] = React.useState<SalesPerson[]>([]);
  const [modes, setModes] = React.useState<Mode[]>([]);
  const [ports, setPorts] = React.useState<Port[]>([]);
  const [chargeDescriptions, setChargeDescriptions] = React.useState<string[]>([]);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [companyId, setCompanyId] = React.useState<number | null>(null);
  const [currentUserId, setCurrentUserIdState] = React.useState<string | null>(null);

  // Latest values for the (stable) action callbacks — avoids stale closures.
  const live = React.useRef({ enquiries, documents, customers, salesPeople, modes, companyId });
  live.current = { enquiries, documents, customers, salesPeople, modes, companyId };

  React.useEffect(() => {
    try {
      setCurrentUserIdState(window.localStorage.getItem(USER_KEY));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setCurrentUserId = React.useCallback((id: string | null) => {
    setCurrentUserIdState(id);
    try {
      if (id) window.localStorage.setItem(USER_KEY, id);
      else window.localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const currentUser = React.useMemo(
    () => salesPeople.find((s) => s.id === currentUserId) ?? null,
    [salesPeople, currentUserId]
  );

  const refreshOperational = React.useCallback(async () => {
    const { modes: ms } = live.current;
    const modeNameById = new Map(ms.map((m) => [Number(m.id), m.name]));
    const jobs = await fetchJobs(modeNameById);
    const jobNoById = new Map(jobs.map((j) => [Number(j.id), j.jobNo]));
    const enqs = await fetchEnquiries(modeNameById, jobNoById);
    setShipments(jobs);
    setEnquiries(enqs);
  }, []);

  const refreshDocuments = React.useCallback(async () => {
    const nameById = new Map(live.current.customers.map((c) => [Number(c.id), c.name]));
    setDocuments(await fetchDocuments(nameById));
  }, []);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setWarning(null);
    try {
      const [customerRows, descriptions, salesRows, modeRows, portRows] = await Promise.all([
        fetchCustomers(),
        fetchDescriptions(),
        fetchSalesPersons(),
        fetchModes(),
        fetchPorts(),
      ]);

      const modeNameById = new Map(modeRows.map((m) => [Number(m.id), m.name]));
      const customerNameById = new Map(customerRows.map((c) => [Number(c.id), c.name]));
      const jobs = await fetchJobs(modeNameById);
      const jobNoById = new Map(jobs.map((j) => [Number(j.id), j.jobNo]));
      const [enqs, docs, cid] = await Promise.all([
        fetchEnquiries(modeNameById, jobNoById),
        fetchDocuments(customerNameById),
        resolveCompanyId().catch(() => null),
      ]);
      const comp = await fetchCompany(cid);

      setCustomers(customerRows);
      setChargeDescriptions(descriptions);
      setSalesPeople(salesRows);
      setModes(modeRows);
      setPorts(portRows);
      setShipments(jobs);
      setEnquiries(enqs);
      setDocuments(docs);
      setCompanyId(cid);
      setCompany(comp);

      if (customerRows.length === 0 && modeRows.length === 0 && portRows.length === 0 && enqs.length === 0) {
        setWarning(
          'Connected to Supabase, but every table returned zero rows. If the tables do have data, Row Level Security is probably blocking the anon key — add SELECT policies (see supabase/setup.sql).'
        );
      }
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const latestRates = React.useMemo<ExchangeRates | null>(() => {
    const e = enquiries.find((x) => x.rates.usd > 0 && x.rates.eur > 0 && x.rates.gbp > 0);
    return e ? e.rates : null;
  }, [enquiries]);

  // -------------------------------------------------------------------------
  // Enquiries
  // -------------------------------------------------------------------------

  const buildWrite = (input: EnquiryInput): EnquiryWrite => {
    const { customers: cs, modes: ms, salesPeople: sp } = live.current;
    const customer = cs.find((c) => c.id === input.customerId);
    const mode = ms.find((m) => m.id === input.modeId);
    const person = sp.find((s) => s.id === input.salesPersonId);
    if (!customer) throw new Error('Selected customer no longer exists.');
    if (!mode) throw new Error('Selected shipment mode no longer exists.');
    if (!person) throw new Error('Selected sales person no longer exists.');
    return {
      customerId: Number(customer.id),
      customerName: customer.name,
      customerAddress: customer.address,
      customerGst: customer.gst,
      shipper: input.shipper,
      consignee: input.consignee,
      modeId: Number(mode.id),
      polCountry: input.polCountry,
      polPort: input.polPort,
      podCountry: input.podCountry,
      podPort: input.podPort,
      commodity: input.commodity,
      packages: input.packages,
      packageUnit: input.packageUnit,
      grossWeight: input.grossWeight,
      weightUnit: input.weightUnit,
      cbm: input.cbm,
      salesPersonId: Number(person.id),
      salesPersonName: person.name,
      usdRate: input.rates.usd,
      eurRate: input.rates.eur,
      gbpRate: input.rates.gbp,
      charges: input.charges,
    };
  };

  const addEnquiry = React.useCallback(async (input: EnquiryInput) => {
    const write = buildWrite(input);
    let cid = live.current.companyId;
    if (cid === null) cid = await resolveCompanyId();
    if (cid === null) {
      throw new Error(
        'No company_id found. There are no existing enquiries to copy it from — set NEXT_PUBLIC_COMPANY_ID in .env.local.'
      );
    }
    await insertEnquiry({ ...write, date: todayISO(), companyId: cid });
    if (live.current.companyId === null) setCompanyId(cid);
    await refreshOperational();
  }, [refreshOperational]);

  const updateEnquiry = React.useCallback(async (id: string, input: EnquiryInput) => {
    const existing = live.current.enquiries.find((e) => e.id === id);
    if (!existing) throw new Error('Enquiry not found.');
    if (existing.status !== 'Pending') throw new Error('Only Pending enquiries can be edited.');
    await updateEnquiryDb(Number(id), buildWrite(input));
    await refreshOperational();
  }, [refreshOperational]);

  const confirmEnquiry = React.useCallback(async (id: string) => {
    const enquiry = live.current.enquiries.find((e) => e.id === id);
    if (!enquiry) throw new Error('Enquiry not found.');
    if (enquiry.status !== 'Pending') throw new Error('Only Pending enquiries can be confirmed.');
    const mode = live.current.modes.find((m) => m.id === enquiry.modeId);
    if (!mode) throw new Error('This enquiry has no valid shipment mode, so a job number cannot be generated.');
    const result = await confirmEnquiryAndCreateJob({
      enquiry,
      modeCode: mode.code,
      fiscalYear: fiscalYearLabel(),
    });
    await refreshOperational();
    return { enquiryNo: result.enquiryNo, jobNo: result.jobNo };
  }, [refreshOperational]);

  const cancelEnquiry = React.useCallback(async (id: string, remark: string) => {
    await cancelEnquiryDb(Number(id), remark);
    setEnquiries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'Cancelled', cancellationRemark: remark } : e))
    );
  }, []);

  const updateShipmentRemark = React.useCallback(async (id: string, remark: string, remarkDate: string | null) => {
    await updateJobRemark(Number(id), remark, remarkDate);
    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, remark, remarkDate } : s)));
  }, []);

  // -------------------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------------------

  const addDocument = React.useCallback(async (input: DocumentInput) => {
    const customerId = Number(input.customerId);
    const path = input.file ? await uploadDocumentFile(customerId, input.file) : '';
    try {
      await insertDocument({
        customerId,
        docType: input.docType,
        docNumber: input.docNumber,
        expiryDate: input.expiryDate,
        storedFile: path,
      });
    } catch (err) {
      await removeDocumentFile(path || null);
      throw err;
    }
    await refreshDocuments();
  }, [refreshDocuments]);

  const updateDocument = React.useCallback(async (id: string, input: DocumentInput) => {
    const existing = live.current.documents.find((d) => d.id === id);
    if (!existing) throw new Error('Document not found.');
    const customerId = Number(input.customerId);
    const newPath = input.file ? await uploadDocumentFile(customerId, input.file) : null;
    try {
      await updateDocumentDb(Number(id), {
        customerId,
        docType: input.docType,
        docNumber: input.docNumber,
        expiryDate: input.expiryDate,
        ...(newPath ? { storedFile: newPath } : {}),
      });
    } catch (err) {
      await removeDocumentFile(newPath);
      throw err;
    }
    if (newPath) await removeDocumentFile(existing.filePath);
    await refreshDocuments();
  }, [refreshDocuments]);

  const deleteDocument = React.useCallback(async (id: string) => {
    const existing = live.current.documents.find((d) => d.id === id);
    await deleteDocumentDb(Number(id));
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (existing?.filePath) await removeDocumentFile(existing.filePath);
  }, []);

  const openDocumentFile = React.useCallback(async (doc: KycDocument) => {
    if (!doc.filePath) throw new Error('No file is stored for this document.');
    const url = await getDocumentUrl(doc.filePath);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const value = React.useMemo<CsState>(
    () => ({
      loading,
      loadError,
      warning,
      reload,
      enquiries,
      shipments,
      documents,
      customers,
      salesPeople,
      modes,
      ports,
      chargeDescriptions,
      company,
      latestRates,
      currentUser,
      setCurrentUserId,
      addEnquiry,
      updateEnquiry,
      confirmEnquiry,
      cancelEnquiry,
      updateShipmentRemark,
      addDocument,
      updateDocument,
      deleteDocument,
      openDocumentFile,
    }),
    [
      loading, loadError, warning, reload, enquiries, shipments, documents, customers, salesPeople,
      modes, ports, chargeDescriptions, company, latestRates, currentUser, setCurrentUserId,
      addEnquiry, updateEnquiry, confirmEnquiry, cancelEnquiry, updateShipmentRemark,
      addDocument, updateDocument, deleteDocument, openDocumentFile,
    ]
  );

  return <CsContext.Provider value={value}>{children}</CsContext.Provider>;
}

export function useCs() {
  const ctx = React.useContext(CsContext);
  if (!ctx) throw new Error('useCs must be used within CsProvider');
  return ctx;
}
