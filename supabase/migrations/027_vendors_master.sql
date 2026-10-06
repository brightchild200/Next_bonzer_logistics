-- ============================================================================
-- BONZER LOGISTICS
-- 027 - VENDOR MASTER
-- ============================================================================
-- PURPOSE
--   Create vendors table with same validation/normalization as Customer Master.
--   Reuses exact GST/PAN validation from 007_party_masters.sql.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SEQUENCE FOR VENDOR_REF GENERATION
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.vendors_seq
  START 1
  INCREMENT 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

-- ============================================================================
-- VENDORS TABLE
-- ============================================================================

CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  vendor_ref TEXT NOT NULL UNIQUE
    DEFAULT 'VEN-' || LPAD(NEXTVAL('public.vendors_seq')::TEXT, 5, '0'),

  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,

  gst_number TEXT
    CONSTRAINT vendors_gst_format
    CHECK (gst_number IS NULL OR gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),

  pan_number TEXT
    CONSTRAINT vendors_pan_format
    CHECK (pan_number IS NULL OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),

  CONSTRAINT vendors_pan_gst_match
    CHECK (
      pan_number IS NULL
      OR gst_number IS NULL
      OR SUBSTRING(UPPER(gst_number) FROM 3 FOR 10) = UPPER(pan_number)
    ),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_by UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER vendors_set_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX vendors_company_name_idx ON public.vendors (company_name);
CREATE INDEX vendors_gst_number_idx ON public.vendors (gst_number);
CREATE INDEX vendors_pan_number_idx ON public.vendors (pan_number);
CREATE INDEX vendors_is_active_idx ON public.vendors (is_active);
CREATE INDEX vendors_created_by_idx ON public.vendors (created_by);

-- ============================================================================
-- UNIQUE INDEX ON NORMALIZED COMPANY_NAME (HARD CONFLICT)
-- Same pattern as customers_company_name_norm_unique
-- ============================================================================

CREATE UNIQUE INDEX vendors_company_name_norm_unique
  ON public.vendors (UPPER(REGEXP_REPLACE(TRIM(company_name), '\s+', ' ', 'g')));

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user with vendor:read (or customer:read for backward compat)
CREATE POLICY "vendors_select_permission_aware"
  ON public.vendors
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_permission('vendor:read')
    OR public.current_user_has_permission('customer:read')
  );

-- Insert/Update via SECURITY DEFINER RPC only (see 027_vendor_rpcs.sql)
-- No direct INSERT/UPDATE policies

GRANT SELECT ON public.vendors TO authenticated;
GRANT USAGE, SELECT ON public.vendors_seq TO authenticated;

-- ============================================================================
-- VENDOR MASTER PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (name, category, description)
VALUES
  ('vendor:create', 'vendor', 'Create vendors'),
  ('vendor:read', 'vendor', 'View and search the global vendor master'),
  ('vendor:update', 'vendor', 'Update vendor information'),
  ('vendor:deactivate', 'vendor', 'Deactivate vendors')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROLE PERMISSION ASSIGNMENTS
-- ============================================================================

-- ADMIN + SALES MANAGER: create/read/update/deactivate
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('admin', 'sales_manager')
  AND p.name IN (
    'vendor:create',
    'vendor:read',
    'vendor:update',
    'vendor:deactivate'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SALESPERSON + CUSTOMER SERVICE + PRICING: create/read/update
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('salesperson', 'customer_service', 'pricing')
  AND p.name IN (
    'vendor:create',
    'vendor:read',
    'vendor:update'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- OPERATIONS + ACCOUNTS: read only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('operations', 'accounts')
  AND p.name = 'vendor:read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION 027
-- ============================================================================

COMMIT;