import type {
  VendorInput,
  UpdateVendorInput,
  CreateQuotationInput,
  UpdateQuotationInput,
  CreateRevisionInput,
  QuotationItemInput,
  VendorQuoteInput,
  ExchangeRateInput,
  SupportedCurrency,
  QuotationStatus,
  QuotationItemCategory,
} from './types';

export {
  isValidQuotationItemCategory,
  isSupportedCurrency,
  isValidQuotationStatusTransition,
} from './types';

export function normalizeOptional(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function normalizeGst(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

export function normalizePan(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

export function normalizeCompanyName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeCompanyNameForComparison(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function validateEmailFormat(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

export function validatePhoneFormat(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return 'Invalid phone number. Expected 10-15 digits';
  }
  return null;
}

export function validatePanFormat(pan: string): string | null {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  if (!panRegex.test(pan)) {
    return 'Invalid PAN format. Expected: AAAAA9999A';
  }
  return null;
}

export function validateGstinFormat(gstin: string): string | null {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
  if (!gstinRegex.test(gstin)) {
    return 'Invalid GSTIN format. Expected 15-character GSTIN';
  }
  return null;
}

export function validatePanGstMatch(pan: string, gstin: string): string | null {
  const panInGstin = gstin.substring(2, 12);
  if (panInGstin !== pan) {
    return 'PAN in GSTIN (positions 3-12) does not match provided PAN';
  }
  return null;
}

export function validateCurrency(currency: string, fieldName: string): string | null {
  const supported: SupportedCurrency[] = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AED', 'SGD', 'HKD'];
  if (!supported.includes(currency as SupportedCurrency)) {
    return `${fieldName}: Unsupported currency '${currency}'. Supported: ${supported.join(', ')}`;
  }
  return null;
}

export function validateExchangeRate(rate: number): string | null {
  if (rate <= 0) {
    return 'Exchange rate must be positive';
  }
  if (!Number.isFinite(rate)) {
    return 'Exchange rate must be a valid number';
  }
  return null;
}

export function validateMargin(margin: number): string | null {
  if (margin < 0) {
    return 'Margin cannot be negative';
  }
  if (margin > 1000) {
    return 'Margin seems unreasonably high (max 1000%)';
  }
  if (!Number.isFinite(margin)) {
    return 'Margin must be a valid number';
  }
  return null;
}

export function validateQuantity(quantity: number): string | null {
  if (quantity <= 0) {
    return 'Quantity must be positive';
  }
  if (!Number.isFinite(quantity)) {
    return 'Quantity must be a valid number';
  }
  return null;
}

export function validateCostRate(rate: number): string | null {
  if (rate < 0) {
    return 'Cost rate cannot be negative';
  }
  if (!Number.isFinite(rate)) {
    return 'Cost rate must be a valid number';
  }
  return null;
}

export function validateQuotationStatus(status: string): string | null {
  const validStatuses: QuotationStatus[] = [
    'draft',
    'internal_review',
    'sent_to_sales',
    'customer_discussion',
    'revision_requested',
    'customer_approved',
    'rejected',
    'expired',
    'cancelled',
  ];
  if (!validStatuses.includes(status as QuotationStatus)) {
    return `Invalid quotation status: ${status}`;
  }
  return null;
}

export function validateQuotationItemCategory(category: string): string | null {
  const validCategories: QuotationItemCategory[] = [
    'OCEAN_FREIGHT',
    'AIR_FREIGHT',
    'LOCAL_CHARGES_ORIGIN',
    'LOCAL_CHARGES_DEST',
    'CUSTOMS',
    'TRANSPORT',
    'INSURANCE',
    'OTHER',
  ];
  if (!validCategories.includes(category as QuotationItemCategory)) {
    return `Invalid quotation item category: ${category}`;
  }
  return null;
}

export function validateVendorInput(input: VendorInput): string | null {
  const companyName = normalizeCompanyName(input.company_name ?? '');
  if (!companyName) {
    return 'Company name is required';
  }

  if (input.email) {
    const emailError = validateEmailFormat(input.email);
    if (emailError) return emailError;
  }

  if (input.phone) {
    const phoneError = validatePhoneFormat(input.phone);
    if (phoneError) return phoneError;
  }

  if (input.pan_number) {
    const panError = validatePanFormat(normalizePan(input.pan_number)!);
    if (panError) return panError;
  }

  if (input.gst_number) {
    const gstinError = validateGstinFormat(normalizeGst(input.gst_number)!);
    if (gstinError) return gstinError;
  }

  if (input.pan_number && input.gst_number) {
    const matchError = validatePanGstMatch(
      normalizePan(input.pan_number)!,
      normalizeGst(input.gst_number)!
    );
    if (matchError) return matchError;
  }

  return null;
}

export function validateCreateQuotationInput(input: CreateQuotationInput): string | null {
  if (!input.enquiry_id?.trim()) {
    return 'Enquiry ID is required';
  }

  const baseCurrencyError = validateCurrency(input.base_currency, 'Base currency');
  if (baseCurrencyError) return baseCurrencyError;

  const quoteCurrencyError = validateCurrency(input.quote_currency, 'Quote currency');
  if (quoteCurrencyError) return quoteCurrencyError;

  const exchangeRateError = validateExchangeRate(input.exchange_rate);
  if (exchangeRateError) return exchangeRateError;

  const marginError = validateMargin(input.margin_pct);
  if (marginError) return marginError;

  if (input.valid_until) {
    const validUntil = new Date(input.valid_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (validUntil < today) {
      return 'Valid until date cannot be in the past';
    }
  }

  return null;
}

export function validateUpdateQuotationInput(input: UpdateQuotationInput): string | null {
  if (!input.quotation_id?.trim()) {
    return 'Quotation ID is required';
  }

  if (input.base_currency) {
    const error = validateCurrency(input.base_currency, 'Base currency');
    if (error) return error;
  }

  if (input.quote_currency) {
    const error = validateCurrency(input.quote_currency, 'Quote currency');
    if (error) return error;
  }

  if (input.exchange_rate !== undefined) {
    const error = validateExchangeRate(input.exchange_rate);
    if (error) return error;
  }

  if (input.margin_pct !== undefined) {
    const error = validateMargin(input.margin_pct);
    if (error) return error;
  }

  if (input.valid_until) {
    const validUntil = new Date(input.valid_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (validUntil < today) {
      return 'Valid until date cannot be in the past';
    }
  }

  return null;
}

export function validateCreateRevisionInput(input: CreateRevisionInput): string | null {
  if (!input.quotation_id?.trim()) {
    return 'Quotation ID is required';
  }

  if (input.base_currency) {
    const error = validateCurrency(input.base_currency, 'Base currency');
    if (error) return error;
  }

  if (input.quote_currency) {
    const error = validateCurrency(input.quote_currency, 'Quote currency');
    if (error) return error;
  }

  if (input.exchange_rate !== undefined) {
    const error = validateExchangeRate(input.exchange_rate);
    if (error) return error;
  }

  if (input.margin_pct !== undefined) {
    const error = validateMargin(input.margin_pct);
    if (error) return error;
  }

  if (input.valid_until) {
    const validUntil = new Date(input.valid_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (validUntil < today) {
      return 'Valid until date cannot be in the past';
    }
  }

  return null;
}

export function validateQuotationItemInput(input: QuotationItemInput): string | null {
  if (!input.description?.trim()) {
    return 'Description is required';
  }

  const categoryError = validateQuotationItemCategory(input.category);
  if (categoryError) return categoryError;

  const quantityError = validateQuantity(input.quantity);
  if (quantityError) return quantityError;

  const costRateError = validateCostRate(input.cost_rate);
  if (costRateError) return costRateError;

  const costCurrencyError = validateCurrency(input.cost_currency, 'Cost currency');
  if (costCurrencyError) return costCurrencyError;

  const costExchangeRateError = validateExchangeRate(input.cost_exchange_rate);
  if (costExchangeRateError) return costExchangeRateError;

  if (input.margin_pct !== undefined && input.margin_pct !== null) {
    const marginError = validateMargin(input.margin_pct);
    if (marginError) return marginError;
  }

  return null;
}

export function validateVendorQuoteInput(input: VendorQuoteInput): string | null {
  if (!input.quotation_id?.trim()) {
    return 'Quotation ID is required';
  }

  if (!input.vendor_id?.trim()) {
    return 'Vendor ID is required';
  }

  if (input.currency) {
    const error = validateCurrency(input.currency, 'Currency');
    if (error) return error;
  }

  if (input.total_amount !== undefined && input.total_amount !== null) {
    if (input.total_amount < 0) {
      return 'Total amount cannot be negative';
    }
    if (!Number.isFinite(input.total_amount)) {
      return 'Total amount must be a valid number';
    }
  }

  return null;
}

export function validateExchangeRateInput(input: ExchangeRateInput): string | null {
  const baseCurrencyError = validateCurrency(input.base_currency, 'Base currency');
  if (baseCurrencyError) return baseCurrencyError;

  const quoteCurrencyError = validateCurrency(input.quote_currency, 'Quote currency');
  if (quoteCurrencyError) return quoteCurrencyError;

  if (input.base_currency === input.quote_currency) {
    return 'Base currency and quote currency cannot be the same';
  }

  const rateError = validateExchangeRate(input.rate);
  if (rateError) return rateError;

  if (!input.effective_date) {
    return 'Effective date is required';
  }

  const validSources = ['manual', 'rbi', 'api'];
  if (input.source && !validSources.includes(input.source)) {
    return `Invalid source. Must be one of: ${validSources.join(', ')}`;
  }

  return null;
}