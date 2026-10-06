'use server';

import { createClient } from '@/lib/db/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { getAuthContext, hasPermission, type AuthContext } from '@/lib/auth/server-auth';
import type { Permission } from '@/lib/auth/permissions';
import type {
  Quotation,
  CreateQuotationInput,
  CreateQuotationResult,
  SupportedCurrency,
  QuotationStatus,
} from '../types';
import type { EnquiryStatus } from '@/lib/actions/enquiries/types';
import {
  validateCreateQuotationInput,
  isSupportedCurrency,
} from '../validations';

const VALID_EXCHANGE_RATE_SOURCES = ['manual', 'rbi', 'api'] as const;
type ExchangeRateSource = (typeof VALID_EXCHANGE_RATE_SOURCES)[number];

const INVALID_ENQUIRY_STATES_FOR_QUOTATION: EnquiryStatus[] = ['won', 'lost', 'archived'];

export async function createQuotation(input: CreateQuotationInput): Promise<CreateQuotationResult> {
  const supabase = createClient();

  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult;
  }

  const authContext: AuthContext = authResult.authContext;

  if (!hasPermission(authContext, PERMISSIONS.PRICING.CREATE)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const validationError = validateCreateQuotationInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  if (!isSupportedCurrency(input.base_currency)) {
    return { success: false, error: `Unsupported base currency: ${input.base_currency}` };
  }

  if (!isSupportedCurrency(input.quote_currency)) {
    return { success: false, error: `Unsupported quote currency: ${input.quote_currency}` };
  }

  if (!VALID_EXCHANGE_RATE_SOURCES.includes(input.exchange_rate_source as ExchangeRateSource)) {
    return { success: false, error: `Invalid exchange rate source. Must be one of: ${VALID_EXCHANGE_RATE_SOURCES.join(', ')}` };
  }

  const { data: enquiry, error: enquiryError } = await supabase
    .from('enquiries')
    .select('id, status, owner_id')
    .eq('id', input.enquiry_id)
    .maybeSingle();

  if (enquiryError) {
    console.error('[createQuotation] Enquiry fetch error:', enquiryError);
    return { success: false, error: 'Failed to validate enquiry' };
  }

  if (!enquiry) {
    return { success: false, error: 'Enquiry not found' };
  }

  if (INVALID_ENQUIRY_STATES_FOR_QUOTATION.includes(enquiry.status as EnquiryStatus)) {
    return { success: false, error: `Cannot create quotation for enquiry in '${enquiry.status}' state` };
  }

  const hasReadAccess =
    hasPermission(authContext, PERMISSIONS.PRICING.READ_ALL) ||
    hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_ALL) ||
    (hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_TEAM) &&
      await checkTeamEnquiryAccess(supabase, authContext.userId, enquiry.id)) ||
    (hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_ASSIGNED) &&
      await checkAssignedEnquiryAccess(supabase, authContext.userId, enquiry.id)) ||
    (hasPermission(authContext, PERMISSIONS.ENQUIRY.READ_OWN) &&
      enquiry.owner_id === authContext.userId);

  if (!hasReadAccess) {
    return { success: false, error: 'Insufficient permissions to access this enquiry' };
  }

  const exchangeRateDate = input.exchange_rate_date
    ? new Date(input.exchange_rate_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const payload = {
    enquiry_id: input.enquiry_id,
    base_currency: input.base_currency.toUpperCase(),
    quote_currency: input.quote_currency.toUpperCase(),
    exchange_rate: input.exchange_rate,
    exchange_rate_date: exchangeRateDate,
    exchange_rate_source: input.exchange_rate_source,
    margin_pct: input.margin_pct,
    valid_until: input.valid_until ? new Date(input.valid_until).toISOString().split('T')[0] : null,
    payment_terms: input.payment_terms?.trim() || null,
    notes: input.notes?.trim() || null,
    created_by: authContext.userId,
    status: 'draft' as QuotationStatus,
  };

  const { data, error } = await supabase
    .from('quotations')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[createQuotation] Insert error:', error);
    return { success: false, error: 'Failed to create quotation' };
  }

  await supabase.from('activity_log').insert({
    entity_type: 'quotation',
    entity_id: data.id,
    action: 'created',
    description: `Quotation ${data.quotation_ref} created for enquiry ${input.enquiry_id}`,
    owner_id: authContext.userId,
    new_values: { ...data },
  });

  return {
    success: true,
    quotation: data as Quotation,
  };
}

async function checkTeamEnquiryAccess(supabase: any, userId: string, enquiryId: string): Promise<boolean> {
  const { data: salespersonRole } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'salesperson')
    .single();

  if (!salespersonRole) {
    return false;
  }

  const { data: teamUserIds, error: teamError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role_id', salespersonRole.id);

  if (teamError || !teamUserIds?.length) {
    return false;
  }

  const teamUserIdValues = teamUserIds.map((r: { user_id: string }) => r.user_id);

  const { data: teamEnquiries, error } = await supabase
    .from('enquiries')
    .select('id')
    .eq('id', enquiryId)
    .in('owner_id', teamUserIdValues)
    .neq('owner_id', userId);

  return !error && (teamEnquiries?.length ?? 0) > 0;
}

async function checkAssignedEnquiryAccess(supabase: any, userId: string, enquiryId: string): Promise<boolean> {
  const { data: assignedEnquiry, error } = await supabase
    .from('enquiries')
    .select('id')
    .eq('id', enquiryId)
    .eq('assigned_customer_service_id', userId)
    .maybeSingle();

  return !error && !!assignedEnquiry;
}