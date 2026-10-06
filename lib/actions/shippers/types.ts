export interface Shipper {
  id: string;
  shipper_ref: string;
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

export interface ShipperInput {
  company_name: string;
  contact_person?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  address?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  country?: string | null | undefined;
  pincode?: string | null | undefined;
  gst_number?: string | null | undefined;
  pan_number?: string | null | undefined;
  source_customer_id?: string | null | undefined;
}

export interface UpdateShipperInput extends ShipperInput {
  shipper_id: string;
}

export interface CreateShipperPartyResult {
  shipper_ref: string;
  shipper_id: string;
}

export interface ShipperSearchResult {
  id: string;
  shipper_ref: string;
  company_name: string;
  contact_person: string | null;
  city: string | null;
  country: string | null;
  source_customer_id: string | null;
}

export interface SearchShippersParams {
  searchText: string;
  limit?: number;
}

export interface SearchShippersResult {
  success: true;
  shippers: ShipperSearchResult[];
}

export interface SearchShippersError {
  success: false;
  error: string;
}

export type SearchShippersResponse = SearchShippersResult | SearchShippersError;

export interface ListShippersParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListShippersResult {
  success: true;
  shippers: Shipper[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ListShippersError {
  success: false;
  error: string;
}

export type ListShippersResponse = ListShippersResult | ListShippersError;

export type ShipperDuplicateWarningType =
  | 'email'
  | 'phone'
  | 'company_name'
  | 'pan'
  | 'exact_company_name';

export interface ShipperDuplicateWarning {
  type: ShipperDuplicateWarningType;
  shipper_id: string;
  shipper_ref: string;
  company_name: string;
  message: string;
}