export interface Consignee {
  id: string;
  consignee_ref: string;
  source_customer_id: string | null;
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

export interface ConsigneeInput {
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gst_number?: string;
  pan_number?: string;
  source_customer_id?: string;
}

export interface UpdateConsigneeInput extends ConsigneeInput {
  consignee_id: string;
}

export interface ConsigneeSearchResult {
  id: string;
  consignee_ref: string;
  company_name: string;
  contact_person: string | null;
  city: string | null;
  country: string | null;
  source_customer_id: string | null;
}

export interface CreateConsigneePartyResult {
  consignee_ref: string;
}

export type ConsigneeDuplicateWarningType =
  | 'email'
  | 'phone'
  | 'company_name'
  | 'pan'
  | 'exact_company_name';

export interface ConsigneeDuplicateWarning {
  type: ConsigneeDuplicateWarningType;
  consignee_id: string;
  consignee_ref: string;
  company_name: string;
  message: string;
}