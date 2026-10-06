-- ============================================================================
-- BONZER LOGISTICS
-- 028 - QUOTATIONS (Versioned, linked to Enquiry)
-- ============================================================================
-- PURPOSE
--   Create quotations table with versioning support.
--   One Enquiry can have multiple Quotation versions (revision history).
--   Parent-child self-ref for linear version chain.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SEQUENCE FOR QUOTATION_REF GENERATION
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.quotations_seq
  START 1
  INCREMENT 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

-- ============================================================================
-- QUOTATIONS TABLE
-- ============================================================================

CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),

  -- Enquiry linkage (required)
  enquiry_id UUID NOT NULL
    REFERENCES public.enquiries(id)
    ON DELETE RESTRICT,

  -- Versioning: self-ref for linear history
  parent_quotation_id UUID
    REFERENCES public.quotations(id)
    ON DELETE SET NULL,

  version INTEGER NOT NULL DEFAULT 1,

  quotation_ref TEXT NOT NULL UNIQUE
    DEFAULT 'QUO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.quotations_seq')::TEXT, 5, '0'),

  -- Status Lifecycle
  status TEXT NOT NULL DEFAULT 'draft'
    CONSTRAINT quotations_status_check
    CHECK (status IN (
      'draft',
      'internal_review',
      'sent_to_sales',
      'customer_discussion',
      'revision_requested',
      'customer_approved',
      'rejected',
      'expired',
      'cancelled'
    )),

  -- Currency & Exchange (SNAPSHOTTED on creation)
  base_currency TEXT NOT NULL DEFAULT 'INR',
  quote_currency TEXT NOT NULL DEFAULT 'INR',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  exchange_rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exchange_rate_source TEXT NOT NULL DEFAULT 'manual'  -- 'manual' | 'rbi' | 'api'

  -- Margin: global default (per-line can override)
  margin_pct NUMERIC NOT NULL DEFAULT 0,

  -- Totals (computed from line items via triggers/RPC)
  total_cost_amount NUMERIC DEFAULT 0,
  total_selling_amount NUMERIC DEFAULT 0,
  total_margin_amount NUMERIC DEFAULT 0,

  -- Validity & Terms
  valid_until DATE,
  payment_terms TEXT,
  notes TEXT,

  -- Audit
  created_by UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,

  approved_by UUID
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enforce linear version per enquiry
  CONSTRAINT unique_enquiry_version UNIQUE (enquiry_id, version)
);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER quotations_set_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX quotations_enquiry_id_idx ON public.quotations (enquiry_id);
CREATE INDEX quotations_parent_id_idx ON public.quotations (parent_quotation_id);
CREATE INDEX quotations_status_idx ON public.quotations (status);
CREATE INDEX quotations_created_by_idx ON public.quotations (created_by);
CREATE INDEX quotations_enquiry_version_idx ON public.quotations (enquiry_id, version DESC);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Select: Pricing team + Salesperson (own enquiries) + CS (assigned) + Sales Manager (team) + Admin
CREATE POLICY "quotations_select_permission_aware"
  ON public.quotations
  FOR SELECT
  TO authenticated
  USING (
    -- Admin: full access
    public.current_user_has_permission('pricing:read_all')

    -- Pricing team: read all quotations
    OR public.current_user_has_permission('pricing:read')

    -- Sales Manager: team's enquiries' quotations
    OR (
      public.current_user_has_permission('enquiry:read_team')
      AND enquiry_id IN (
        SELECT e.id FROM public.enquiries e
        WHERE e.owner_id IN (
          SELECT ur.user_id
          FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE r.name = 'salesperson'
            AND ur.user_id != (SELECT auth.uid())
        )
      )
    )

    -- Customer Service: assigned enquiries' quotations
    OR (
      public.current_user_has_permission('enquiry:read_assigned')
      AND enquiry_id IN (
        SELECT id FROM public.enquiries
        WHERE assigned_customer_service_id = (SELECT auth.uid())
      )
    )

    -- Salesperson: own enquiries' quotations
    OR (
      public.current_user_has_permission('enquiry:read_own')
      AND enquiry_id IN (
        SELECT id FROM public.enquiries
        WHERE owner_id = (SELECT auth.uid())
      )
    )
  );

-- Insert: Pricing team creates
CREATE POLICY "quotations_insert_permission_aware"
  ON public.quotations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_permission('pricing:create')
    AND created_by = (SELECT auth.uid())
  );

-- Update: Pricing team updates drafts; Salesperson can send to customer
CREATE POLICY "quotations_update_permission_aware"
  ON public.quotations
  FOR UPDATE
  TO authenticated
  USING (
    -- Pricing team: full update on own/any
    public.current_user_has_permission('pricing:update')

    -- Salesperson: can transition status to sent_to_sales / customer_discussion
    OR (
      public.current_user_has_permission('enquiry:update_sales_fields')
      AND enquiry_id IN (
        SELECT id FROM public.enquiries
        WHERE owner_id = (SELECT auth.uid())
      )
    )

    -- Admin: full
    OR public.current_user_has_permission('pricing:read_all')
  )
  WITH CHECK (
    public.current_user_has_permission('pricing:update')
    OR public.current_user_has_permission('pricing:read_all')
  );

-- Delete: Admin only
CREATE POLICY "quotations_delete_permission_aware"
  ON public.quotations
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_has_permission('pricing:read_all')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT USAGE, SELECT ON public.quotations_seq TO authenticated;

-- ============================================================================
-- QUOTATION PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (name, category, description)
VALUES
  ('pricing:create', 'pricing', 'Create quotations'),
  ('pricing:read', 'pricing', 'View quotations (pricing team)'),
  ('pricing:read_all', 'pricing', 'View all quotations (admin)'),
  ('pricing:update', 'pricing', 'Update quotations (pricing team)'),
  ('pricing:send', 'pricing', 'Send quotation to salesperson'),
  ('pricing:approve', 'pricing', 'Approve quotation (customer approval)'),
  ('pricing:revise', 'pricing', 'Create quotation revision'),
  ('pricing:manage_vendor_quotes', 'pricing', 'Manage vendor quotes'),
  ('pricing:manage_exchange_rates', 'pricing', 'Manage exchange rates')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROLE PERMISSION ASSIGNMENTS
-- ============================================================================

-- ADMIN: all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
  AND p.name LIKE 'pricing:%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PRICING TEAM: create/read/update/send/revise/vendor/exchange
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'pricing'
  AND p.name IN (
    'pricing:create',
    'pricing:read',
    'pricing:update',
    'pricing:send',
    'pricing:revise',
    'pricing:manage_vendor_quotes',
    'pricing:manage_exchange_rates'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SALESPERSON: read own, send, approve (record customer approval), revise
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'salesperson'
  AND p.name IN (
    'pricing:read',
    'pricing:send',
    'pricing:approve',
    'pricing:revise'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SALES MANAGER: read team, send, approve, revise
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'sales_manager'
  AND p.name IN (
    'pricing:read',
    'pricing:send',
    'pricing:approve',
    'pricing:revise'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CUSTOMER SERVICE: read assigned
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'customer_service'
  AND p.name = 'pricing:read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION 028
-- ============================================================================

COMMIT;