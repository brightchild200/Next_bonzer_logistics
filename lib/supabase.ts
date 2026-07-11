import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type EnquiryStatus = 'new' | 'quoted' | 'won' | 'lost' | 'archived';
export type ShipmentStatus = 'booked' | 'in_transit' | 'customs' | 'delivered' | 'on_hold';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type ShipmentMode = 'air' | 'sea' | 'road' | 'rail';

export type Customer = {
  id: string;
  owner_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  industry: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Enquiry = {
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
  status: string;
  expected_shipment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Shipment = {
  id: string;
  owner_id: string;
  reference: string;
  enquiry_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  mode: string;
  carrier: string | null;
  status: string;
  eta: string | null;
  actual_delivery: string | null;
  value: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  owner_id: string;
  reference: string;
  customer_id: string | null;
  customer_name: string | null;
  shipment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  owner_id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  description: string | null;
  created_at: string;
};

export type TeamMember = {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  role: string | null;
  status: string;
  avatar_color: string;
  created_at: string;
};
