export type QuotationStatus =
  | 'draft'
  | 'internal_review'
  | 'sent_to_sales'
  | 'customer_discussion'
  | 'revision_requested'
  | 'customer_approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export type QuotationItemCategory =
  | 'OCEAN_FREIGHT'
  | 'AIR_FREIGHT'
  | 'LOCAL_CHARGES_ORIGIN'
  | 'LOCAL_CHARGES_DEST'
  | 'CUSTOMS'
  | 'TRANSPORT'
  | 'INSURANCE'
  | 'OTHER';

export interface Vendor {
  id: string;
  vendor_ref: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  gst_number: string | null;
  pan_number: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VendorInput {
  company_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
}

export interface UpdateVendorInput extends VendorInput {
  vendor_id: string;
}

export interface CreateVendorPartyResult {
  vendor_ref: string;
  vendor_id: string;
}

export interface VendorSearchResult {
  id: string;
  vendor_ref: string;
  company_name: string;
  contact_person: string | null;
  city: string | null;
  country: string | null;
}

export interface SearchVendorsParams {
  searchText: string;
  limit?: number;
}

export interface SearchVendorsResult {
  success: true;
  vendors: VendorSearchResult[];
}

export interface SearchVendorsError {
  success: false;
  error: string;
}

export type SearchVendorsResponse = SearchVendorsResult | SearchVendorsError;

export type VendorSortField = 'vendor_ref' | 'company_name' | 'city' | 'country' | 'created_at' | 'updated_at';

export interface ListVendorsParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: VendorSortField;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface ListVendorsResult {
  success: true;
  vendors: Vendor[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ListVendorsError {
  success: false;
  error: string;
}

export type ListVendorsResponse = ListVendorsResult | ListVendorsError;

export interface VendorDuplicateWarningType {
  type: 'email' | 'phone' | 'company_name' | 'pan' | 'exact_company_name' | 'gst';
  vendor_id: string;
  vendor_ref: string;
  company_name: string;
  message: string;
}

export interface VendorDuplicateWarning {
  type: VendorDuplicateWarningType['type'];
  vendor_id: string;
  vendor_ref: string;
  company_name: string;
  message: string;
}

export interface Quotation {
  id: string;
  enquiry_id: string;
  parent_quotation_id: string | null;
  version: number;
  quotation_ref: string;
  status: QuotationStatus;
  base_currency: string;
  quote_currency: string;
  exchange_rate: number;
  exchange_rate_date: string;
  exchange_rate_source: string;
  margin_pct: number;
  total_cost_amount: number;
  total_selling_amount: number;
  total_margin_amount: number;
  valid_until: string | null;
  payment_terms: string | null;
  notes: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationWithItems extends Quotation {
  items: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  sort_order: number;
  category: QuotationItemCategory;
  description: string;
  unit: string;
  quantity: number;
  vendor_id: string | null;
  vendor_quote_ref: string | null;
  cost_rate: number;
  cost_currency: string;
  cost_exchange_rate: number;
  cost_exchange_rate_date: string | null;
  cost_amount: number;
  margin_pct: number | null;
  selling_currency: string;
  selling_rate: number;
  selling_amount_base: number;
  selling_amount_quote: number;
  created_at: string;
  updated_at: string;
  vendor?: Vendor | null;
}

export interface QuotationItemInput {
  category: QuotationItemCategory;
  description: string;
  unit?: string;
  quantity: number;
  vendor_id?: string | null;
  vendor_quote_ref?: string | null;
  cost_rate: number;
  cost_currency: string;
  cost_exchange_rate: number;
  cost_exchange_rate_date?: string | null;
  margin_pct?: number | null;
}

export interface CreateQuotationItemInput extends QuotationItemInput {
  quotation_id: string;
}

export interface UpdateQuotationItemInput extends QuotationItemInput {
  item_id: string;
}

export interface ReorderQuotationItemInput {
  item_id: string;
  sort_order: number;
}

export interface CreateQuotationInput {
  enquiry_id: string;
  base_currency: string;
  quote_currency: string;
  exchange_rate: number;
  exchange_rate_date: string;
  exchange_rate_source: string;
  margin_pct: number;
  valid_until?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
}

export interface UpdateQuotationInput {
  quotation_id: string;
  base_currency?: string;
  quote_currency?: string;
  exchange_rate?: number;
  exchange_rate_date?: string;
  exchange_rate_source?: string;
  margin_pct?: number;
  valid_until?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
}

export interface CreateRevisionInput {
  quotation_id: string;
  base_currency?: string;
  quote_currency?: string;
  exchange_rate?: number;
  exchange_rate_date?: string;
  exchange_rate_source?: string;
  margin_pct?: number;
  valid_until?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  copy_items?: boolean;
}

export interface ChangeQuotationStatusInput {
  quotation_id: string;
  status: QuotationStatus;
}

export interface QuotationStatusTransition {
  from: QuotationStatus;
  to: QuotationStatus;
}

export type QuotationSortField = 'quotation_ref' | 'version' | 'status' | 'created_at' | 'updated_at';

export interface ListQuotationsParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: QuotationSortField;
  sortOrder?: 'asc' | 'desc';
  status?: QuotationStatus | QuotationStatus[];
  enquiryId?: string;
}

export interface ListQuotationsResult {
  success: true;
  quotations: Quotation[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ListQuotationsError {
  success: false;
  error: string;
}

export type ListQuotationsResponse = ListQuotationsResult | ListQuotationsError;

export interface VendorQuote {
  id: string;
  quotation_id: string;
  vendor_id: string;
  vendor_quote_ref: string | null;
  quote_date: string | null;
  valid_until: string | null;
  total_amount: number | null;
  currency: string;
  pdf_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor?: Vendor | null;
}

export interface VendorQuoteInput {
  quotation_id: string;
  vendor_id: string;
  vendor_quote_ref?: string | null;
  quote_date?: string | null;
  valid_until?: string | null;
  total_amount?: number | null;
  currency?: string;
  pdf_path?: string | null;
  notes?: string | null;
}

export interface CreateVendorQuoteInput extends VendorQuoteInput {}

export interface UpdateVendorQuoteInput extends VendorQuoteInput {
  vendor_quote_id: string;
}

export interface ListVendorQuotesParams {
  quotationId: string;
  page?: number;
  pageSize?: number;
}

export interface ListVendorQuotesResult {
  success: true;
  vendorQuotes: VendorQuote[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ListVendorQuotesError {
  success: false;
  error: string;
}

export type ListVendorQuotesResponse = ListVendorQuotesResult | ListVendorQuotesError;

export interface ExchangeRate {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  effective_date: string;
  source: string;
  created_at: string;
}

export interface ExchangeRateInput {
  base_currency: string;
  quote_currency: string;
  rate: number;
  effective_date: string;
  source?: string;
}

export interface CreateExchangeRateInput extends ExchangeRateInput {}

export interface UpdateExchangeRateInput extends ExchangeRateInput {
  exchange_rate_id: string;
}

export type ExchangeRateSortField = 'base_currency' | 'quote_currency' | 'rate' | 'effective_date' | 'created_at';

export interface ListExchangeRatesParams {
  baseCurrency?: string;
  quoteCurrency?: string;
  page?: number;
  pageSize?: number;
  sortBy?: ExchangeRateSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface ListExchangeRatesResult {
  success: true;
  exchangeRates: ExchangeRate[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ListExchangeRatesError {
  success: false;
  error: string;
}

export type ListExchangeRatesResponse = ListExchangeRatesResult | ListExchangeRatesError;

export type CreateQuotationResult =
  | {
      success: true;
      quotation: Quotation;
    }
  | {
      success: false;
      error: string;
    };

export type CreateQuotationItemResult =
  | {
      success: true;
      item: QuotationItem;
    }
  | {
      success: false;
      error: string;
    };

export type UpdateQuotationItemResult =
  | {
      success: true;
      item: QuotationItem;
    }
  | {
      success: false;
      error: string;
    };

export type DeleteQuotationItemResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export type CreateVendorResult =
  | {
      success: true;
      vendor: Vendor;
      warnings: VendorDuplicateWarning[];
      partyResult: CreateVendorPartyResult;
    }
  | {
      success: false;
      error: string;
    };

export type UpdateVendorResult =
  | {
      success: true;
      vendor: Vendor;
    }
  | {
      success: false;
      error: string;
    };

export type CreateVendorQuoteResult =
  | {
      success: true;
      vendorQuote: VendorQuote;
    }
  | {
      success: false;
      error: string;
    };

export type UpdateVendorQuoteResult =
  | {
      success: true;
      vendorQuote: VendorQuote;
    }
  | {
      success: false;
      error: string;
    };

export type CreateExchangeRateResult =
  | {
      success: true;
      exchangeRate: ExchangeRate;
    }
  | {
      success: false;
      error: string;
    };

export type UpdateExchangeRateResult =
  | {
      success: true;
      exchangeRate: ExchangeRate;
    }
  | {
      success: false;
      error: string;
    };

export type CreateRevisionResult =
  | {
      success: true;
      quotation: Quotation;
    }
  | {
      success: false;
      error: string;
    };

export type ChangeQuotationStatusResult =
  | {
      success: true;
      quotation: Quotation;
    }
  | {
      success: false;
      error: string;
    };

export const VALID_QUOTATION_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ['internal_review', 'cancelled'],
  internal_review: ['draft', 'sent_to_sales', 'cancelled'],
  sent_to_sales: ['customer_discussion', 'revision_requested', 'cancelled'],
  customer_discussion: ['customer_approved', 'revision_requested', 'rejected', 'sent_to_sales'],
  revision_requested: ['draft', 'internal_review', 'cancelled'],
  customer_approved: ['rejected', 'expired'],
  rejected: ['draft', 'internal_review'],
  expired: ['draft', 'internal_review'],
  cancelled: [],
};

export function isValidQuotationStatusTransition(
  from: QuotationStatus,
  to: QuotationStatus
): boolean {
  const allowed = VALID_QUOTATION_STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export const QUOTATION_ITEM_CATEGORIES: QuotationItemCategory[] = [
  'OCEAN_FREIGHT',
  'AIR_FREIGHT',
  'LOCAL_CHARGES_ORIGIN',
  'LOCAL_CHARGES_DEST',
  'CUSTOMS',
  'TRANSPORT',
  'INSURANCE',
  'OTHER',
];

export function isValidQuotationItemCategory(category: string): category is QuotationItemCategory {
  return QUOTATION_ITEM_CATEGORIES.includes(category as QuotationItemCategory);
}

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AED', 'SGD', 'HKD'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}