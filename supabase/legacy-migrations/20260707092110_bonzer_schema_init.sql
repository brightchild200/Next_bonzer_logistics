/*
# Bonzer Logistics ERP — Initial Schema

## Overview
Creates the core tables for an international logistics & freight-forwarding ERP:
customers, enquiries, quotations, shipments, invoices, activity log, and team
members. All tables are owner-scoped to the authenticated user who created them
(multi-tenant via auth.uid()), with full CRUD RLS policies.

## New Tables
1. `customers` — organizations the user ships for.
   - id (uuid pk), owner_id (auth user), company_name, contact_name, email,
     phone, country, city, address, industry, status, created_at, updated_at.
2. `enquiries` — inbound freight enquiries.
   - id, owner_id, reference (auto ENQ-####), customer_id (fk customers),
     origin, destination, mode (air/sea/road/rail), cargo_type, weight_kg,
     volume_cbm, incoterm, status (new/quoted/won/lost/archived),
     expected_shipment_date, notes, created_at, updated_at.
3. `quotations` — quotes issued against enquiries.
   - id, owner_id, enquiry_id (fk enquiries), reference (QUO-####),
     total_amount, currency, valid_until, status, created_at, updated_at.
4. `shipments` — booked shipments.
   - id, owner_id, enquiry_id (fk enquiries nullable), customer_id (fk customers),
     reference (SHP-####), origin, destination, mode, carrier, status
     (booked/in_transit/customs/delivered/on_hold), eta, actual_delivery,
     value, currency, created_at, updated_at.
5. `invoices` — billing records.
   - id, owner_id, customer_id (fk customers), shipment_id (fk shipments nullable),
     reference (INV-####), amount, currency, status (draft/sent/paid/overdue),
     issued_at, due_at, paid_at, created_at, updated_at.
6. `activity_log` — audit trail of user actions.
   - id, owner_id, entity_type, entity_id, action, description, created_at.
7. `team_members` — internal team directory (owner-scoped).
   - id, owner_id, name, email, role, status, avatar_color, created_at.

## Security
- RLS enabled on every table.
- 4 policies per table (select/insert/update/delete), scoped to `authenticated`
  via `auth.uid() = owner_id`.
- All owner_id columns default to `auth.uid()` so inserts that omit the owner
  still satisfy the WITH CHECK policy.

## Notes
1. Reference numbers are generated client-side; a unique constraint is NOT
   enforced to keep inserts resilient — the app formats them from the row id.
2. All foreign keys ON DELETE SET NULL for nullable links, CASCADE only where
   the child truly belongs to the parent (none here — enquiries keep their
   customer even if the customer row is removed, set null).
3. updated_at is maintained client-side for simplicity.
*/

-- ============ customers ============
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  country text,
  city text,
  address text,
  industry text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_customers" ON customers;
CREATE POLICY "select_own_customers" ON customers FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_customers" ON customers;
CREATE POLICY "insert_own_customers" ON customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_customers" ON customers;
CREATE POLICY "update_own_customers" ON customers FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_customers" ON customers;
CREATE POLICY "delete_own_customers" ON customers FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- ============ enquiries ============
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  origin text,
  destination text,
  mode text NOT NULL DEFAULT 'sea',
  cargo_type text,
  weight_kg numeric,
  volume_cbm numeric,
  incoterm text,
  status text NOT NULL DEFAULT 'new',
  expected_shipment_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_enquiries" ON enquiries;
CREATE POLICY "select_own_enquiries" ON enquiries FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_enquiries" ON enquiries;
CREATE POLICY "insert_own_enquiries" ON enquiries FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_enquiries" ON enquiries;
CREATE POLICY "update_own_enquiries" ON enquiries FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_enquiries" ON enquiries;
CREATE POLICY "delete_own_enquiries" ON enquiries FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS enquiries_owner_status_idx ON enquiries(owner_id, status);
CREATE INDEX IF NOT EXISTS enquiries_owner_created_idx ON enquiries(owner_id, created_at DESC);

-- ============ quotations ============
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  enquiry_id uuid REFERENCES enquiries(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  valid_until date,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_quotations" ON quotations;
CREATE POLICY "select_own_quotations" ON quotations FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_quotations" ON quotations;
CREATE POLICY "insert_own_quotations" ON quotations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_quotations" ON quotations;
CREATE POLICY "update_own_quotations" ON quotations FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_quotations" ON quotations;
CREATE POLICY "delete_own_quotations" ON quotations FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- ============ shipments ============
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  enquiry_id uuid REFERENCES enquiries(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  origin text,
  destination text,
  mode text NOT NULL DEFAULT 'sea',
  carrier text,
  status text NOT NULL DEFAULT 'booked',
  eta date,
  actual_delivery date,
  value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_shipments" ON shipments;
CREATE POLICY "select_own_shipments" ON shipments FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_shipments" ON shipments;
CREATE POLICY "insert_own_shipments" ON shipments FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_shipments" ON shipments;
CREATE POLICY "update_own_shipments" ON shipments FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_shipments" ON shipments;
CREATE POLICY "delete_own_shipments" ON shipments FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS shipments_owner_status_idx ON shipments(owner_id, status);

-- ============ invoices ============
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  shipment_id uuid REFERENCES shipments(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft',
  issued_at date,
  due_at date,
  paid_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- ============ activity_log ============
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_activity" ON activity_log;
CREATE POLICY "select_own_activity" ON activity_log FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_activity" ON activity_log;
CREATE POLICY "insert_own_activity" ON activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_activity" ON activity_log;
CREATE POLICY "update_own_activity" ON activity_log FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_activity" ON activity_log;
CREATE POLICY "delete_own_activity" ON activity_log FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE INDEX IF NOT EXISTS activity_owner_created_idx ON activity_log(owner_id, created_at DESC);

-- ============ team_members ============
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text,
  status text NOT NULL DEFAULT 'active',
  avatar_color text NOT NULL DEFAULT '#2563eb',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_team" ON team_members;
CREATE POLICY "select_own_team" ON team_members FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "insert_own_team" ON team_members;
CREATE POLICY "insert_own_team" ON team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "update_own_team" ON team_members;
CREATE POLICY "update_own_team" ON team_members FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "delete_own_team" ON team_members;
CREATE POLICY "delete_own_team" ON team_members FOR DELETE TO authenticated USING (auth.uid() = owner_id);
