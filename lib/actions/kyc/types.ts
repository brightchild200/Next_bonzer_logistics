import type { CustomerKycStatus } from '../customers/types';

export type KycStatusFilter = 'all' | CustomerKycStatus;

export interface KycRecord {
  id: string;
  customer_ref: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  kyc_status: CustomerKycStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  enquiry_count: number;
  latest_enquiry_ref: string | null;
  latest_enquiry_status: string | null;
}

export interface ListKycParams {
  search?: string;
  status?: KycStatusFilter;
  page?: number;
  pageSize?: number;
  sortBy?: keyof KycRecord;
  sortOrder?: 'asc' | 'desc';
}

export type ListKycResult =
  | { success: true; records: KycRecord[]; totalCount: number }
  | { success: false; error: string };

export interface UpdateKycStatusInput {
  customer_id: string;
  kyc_status: CustomerKycStatus;
}

export type UpdateKycStatusResult =
  | { success: true; customer: KycRecord }
  | { success: false; error: string };