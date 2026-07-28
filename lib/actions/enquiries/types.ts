export type EnquiryStatus = 'new' | 'quoted' | 'won' | 'lost' | 'archived';

export interface EnquiryWorkflowRecord {
  id: string;
  owner_id: string;
  reference: string;
  customer_id: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  mode: string;
  cargo_type: string | null;
  weight_kg: number | null;
  volume_cbm: number | null;
  incoterm: string | null;
  status: EnquiryStatus;
  expected_shipment_date: string | null;
  notes: string | null;
  assigned_customer_service_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  quoted_at: string | null;
  won_at: string | null;
  lost_at: string | null;
  archived_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerServiceInboxFilters {
  status?: EnquiryStatus | EnquiryStatus[];
  assignedCustomerServiceId?: string;
  limit?: number;
  offset?: number;
}

export interface AssignEnquiryInput {
  enquiryId: string;
  customerServiceId: string;
}

export interface UpdateEnquiryStatusInput {
  enquiryId: string;
  status: Exclude<EnquiryStatus, 'new'>;
}
