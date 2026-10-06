import type { Currency, DocType } from './types';

/**
 * Structural options. These are NOT business data: they mirror columns /
 * enums in the schema (usd/eur/gbp exchange-rate columns, the doc_type
 * values the Documents screen colour-codes, etc.). Anything a customer
 * would maintain (customers, ports, modes, sales people, charge
 * descriptions) is loaded from Supabase instead.
 */
export const CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP'];
export const DOC_TYPES: DocType[] = ['IEC', 'GST', 'PAN', 'KYC'];
export const PACKAGE_UNITS = ['Cartons', 'Pallets', 'Crates', 'Bags', 'Boxes', 'Drums', 'Containers'];
export const WEIGHT_UNITS = ['KG', 'LBS', 'MT'];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Supabase Storage bucket that holds customer KYC files. */
export const DOCS_BUCKET = process.env.NEXT_PUBLIC_DOCS_BUCKET || 'customer-documents';

/** Optional overrides. When unset, values are derived from existing rows. */
export const ENV_COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID
  ? Number(process.env.NEXT_PUBLIC_COMPANY_ID)
  : null;
export const ENV_JOB_PREFIX = process.env.NEXT_PUBLIC_JOB_PREFIX || '';
export const ENQUIRY_NO_PREFIX = process.env.NEXT_PUBLIC_ENQUIRY_PREFIX || 'ENQ';
