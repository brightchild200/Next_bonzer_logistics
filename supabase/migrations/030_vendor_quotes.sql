-- ============================================================================
-- BONZER LOGISTICS
-- 030 - VENDOR QUOTES (Attached to Quotation Version)
-- ============================================================================
-- PURPOSE
--   Store vendor quote submissions for comparison.
--   Linked to specific quotation version (not the family).
-- ============================================================================

BEGIN;

-- ============================================================================
-- VENDOR QUOTES TABLE
-- ============================================================================

CREATE TABLE public.vendor_quotes (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),

  quotation_id UUID NOT NULL
    REFERENCES public.quotations(id)
    ON DELETE CASCADE,

  vendor_id UUID NOT NULL
    REFERENCES public.vendors(id)
    ON DELETE RESTRICT,

  vendor_quote_ref TEXT,
  quote_date DATE,
  valid_until DATE,

  total_amount NUMERIC,
  currency TEXT DEFAULT 'INR',

  pdf_path TEXT,  -- storage path in Supabase Storage
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER vendor_quotes_set_updated_at
BEFORE UPDATE ON public.vendor_quotes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX vendor_quotes_quotation_id_idx ON public.vendor_quotes (quotation_id);
CREATE INDEX vendor_quotes_vendor_id_idx ON public.vendor_quotes (vendor_id);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.vendor_quotes ENABLE ROW LEVEL SECURITY;

-- Pricing team can manage; others read if they can see quotation
CREATE POLICY "vendor_quotes_select_permission_aware"
  ON public.vendor_quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = vendor_quotes.quotation_id
        AND (
          public.current_user_has_permission('pricing:read_all')
          OR public.current_user_has_permission('pricing:read')
          OR public.current_user_has_permission('pricing:manage_vendor_quotes')
        )
    )
  );

CREATE POLICY "vendor_quotes_insert_permission_aware"
  ON public.vendor_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_permission('pricing:manage_vendor_quotes')
  );

CREATE POLICY "vendor_quotes_update_permission_aware"
  ON public.vendor_quotes
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_has_permission('pricing:manage_vendor_quotes')
  )
  WITH CHECK (
    public.current_user_has_permission('pricing:manage_vendor_quotes')
  );

CREATE POLICY "vendor_quotes_delete_permission_aware"
  ON public.vendor_quotes
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_has_permission('pricing:manage_vendor_quotes')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_quotes TO authenticated;

-- ============================================================================
-- END OF MIGRATION 030
-- ============================================================================

COMMIT;