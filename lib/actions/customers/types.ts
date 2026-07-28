export type CustomerKycStatus =
  | 'pending'
  | 'submitted'
  | 'verified'
  | 'rejected';

export interface Customer {
  id: string;
  customer_ref: string;
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
  kyc_status: CustomerKycStatus;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
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
  addAsShipper?: boolean;
  addAsConsignee?: boolean;
}

export interface UpdateCustomerInput extends CustomerInput {
    customer_id: string;
  }

export type CustomerDuplicateWarningType =
  | 'email'
  | 'phone'
  | 'company_name'
  | 'pan'
  | 'exact_company_name';

export interface CustomerDuplicateWarning {
  type: CustomerDuplicateWarningType;
  customer_id: string;
  customer_ref: string;
  company_name: string;
  message: string;
}

export interface CreateCustomerPartyResult {
  customer_ref: string;
  shipper_ref: string | null;
  consignee_ref: string | null;
}