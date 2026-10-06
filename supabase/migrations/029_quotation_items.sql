-- ============================================================================
-- BONZER LOGISTICS
-- 029 - QUOTATION LINE ITEMS (Cost + Sell per line)
-- ============================================================================
-- PURPOSE
--   Create quotation_items table with full cost+sell financial model.
--   Financial calculations use BEFORE INSERT/UPDATE trigger for correctness.
--   Snapshots all rates on creation. Historical values immutable after finalization.
-- ============================================================================

BEGIN;

-- ============================================================================
-- QUOTATION ITEMS TABLE
-- ============================================================================

CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),

  quotation_id UUID NOT NULL
    REFERENCES public.quotations(id)
    ON DELETE CASCADE,

  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Category (validated against Bonzer logistics workflow)
  category TEXT NOT NULL
    CONSTRAINT quotation_items_category_check
    CHECK (category IN (
      'OCEAN_FREIGHT',
      'AIR_FREIGHT',
      'LOCAL_CHARGES_ORIGIN',
      'LOCAL_CHARGES_DEST',
      'CUSTOMS',
      'TRANSPORT',
      'INSURANCE',
      'OTHER'
    )),

  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'PER',
  quantity NUMERIC(18,6) NOT NULL DEFAULT 1,

  -- VENDOR COST SIDE
  vendor_id UUID
    REFERENCES public.vendors(id)
    ON DELETE SET NULL,

  vendor_quote_ref TEXT,

  cost_rate NUMERIC(18,6) NOT NULL DEFAULT 0,
  cost_currency TEXT NOT NULL DEFAULT 'INR',
  cost_exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  cost_exchange_rate_date DATE,

  -- COST AMOUNT (persisted snapshot): cost in quotation.base_currency
  -- Calculated as: cost_rate * quantity * cost_exchange_rate
  -- where cost_exchange_rate = base_currency units per 1 cost_currency unit
  cost_amount NUMERIC(18,6) NOT NULL DEFAULT 0,

  -- MARGIN: per-line override (NULL = use quotation default)
  margin_pct NUMERIC(6,3),

  -- SELLING SIDE
  selling_currency TEXT NOT NULL DEFAULT 'INR',

  -- SELLING RATE (persisted snapshot): selling rate in quotation.base_currency
  -- Calculated as: cost_rate * (1 + effective_margin_pct / 100)
  selling_rate NUMERIC(18,6) NOT NULL DEFAULT 0,

  -- SELLING AMOUNT BASE (persisted snapshot): selling amount in quotation.base_currency
  -- Calculated as: cost_amount * (1 + effective_margin_pct / 100)
  -- where effective_margin_pct = COALESCE(item.margin_pct, quotation.margin_pct)
  selling_amount_base NUMERIC(18,6) NOT NULL DEFAULT 0,

  -- SELLING AMOUNT QUOTE (persisted snapshot): selling amount in quotation.quote_currency
  -- Calculated as: selling_amount_base / quotation.exchange_rate
  -- where quotation.exchange_rate = base_currency units per 1 quote_currency unit
  -- (i.e., standard FX pair quotation: base/quote)
  selling_amount_quote NUMERIC(18,6) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER quotation_items_set_updated_at
BEFORE UPDATE ON public.quotation_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX quotation_items_quotation_id_idx ON public.quotation_items (quotation_id);
CREATE INDEX quotation_items_vendor_id_idx ON public.quotation_items (vendor_id);
CREATE INDEX quotation_items_category_idx ON public.quotation_items (category);
CREATE INDEX quotation_items_sort_order_idx ON public.quotation_items (quotation_id, sort_order);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Items inherit quotation visibility
CREATE POLICY "quotation_items_select_permission_aware"
  ON public.quotation_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = quotation_items.quotation_id
        AND (
          public.current_user_has_permission('pricing:read_all')
          OR public.current_user_has_permission('pricing:read')
          OR (
            public.current_user_has_permission('enquiry:read_team')
            AND q.enquiry_id IN (
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
          OR (
            public.current_user_has_permission('enquiry:read_assigned')
            AND q.enquiry_id IN (
              SELECT id FROM public.enquiries
              WHERE assigned_customer_service_id = (SELECT auth.uid())
            )
          )
          OR (
            public.current_user_has_permission('enquiry:read_own')
            AND q.enquiry_id IN (
              SELECT id FROM public.enquiries
              WHERE owner_id = (SELECT auth.uid())
            )
          )
        )
    )
  );

-- Insert/Update: Pricing team only
CREATE POLICY "quotation_items_insert_permission_aware"
  ON public.quotation_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_permission('pricing:create')
  );

CREATE POLICY "quotation_items_update_permission_aware"
  ON public.quotation_items
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_has_permission('pricing:update')
    OR public.current_user_has_permission('pricing:read_all')
  )
  WITH CHECK (
    public.current_user_has_permission('pricing:update')
    OR public.current_user_has_permission('pricing:read_all')
  );

-- Delete: Admin only
CREATE POLICY "quotation_items_delete_permission_aware"
  ON public.quotation_items
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_has_permission('pricing:read_all')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;

-- ============================================================================
-- FINANCIAL CALCULATION TRIGGER
-- ============================================================================
-- Convention documentation:
--
-- EXCHANGE RATE CONVENTION (quotations table):
--   exchange_rate = base_currency units per 1 quote_currency unit
--   (Standard FX pair notation: base/quote)
--   Example: base_currency=USD, quote_currency=INR, exchange_rate=83
--     means 1 USD = 83 INR
--   Conversion: base → quote = base_amount / exchange_rate
--               quote → base = quote_amount * exchange_rate
--
-- COST EXCHANGE RATE CONVENTION (quotation_items table):
--   cost_exchange_rate = quotation.base_currency units per 1 cost_currency unit
--   Conversion: cost_currency → base_currency = cost_amount * cost_exchange_rate
--   Example: cost_currency=USD, base_currency=INR, cost_exchange_rate=83
--     cost_rate=100 USD, quantity=2 → cost_amount = 100 * 2 * 83 = 16,600 INR
--
-- MARGIN DEFINITION (Markup on Cost):
--   selling = cost * (1 + margin_pct / 100)
--   This is MARGIN-ON-COST (markup), not margin-on-selling-price.
--   effective_margin_pct = COALESCE(item.margin_pct, quotation.margin_pct)
--
-- CALCULATION PIPELINE:
--   1. cost_rate_base = cost_rate * cost_exchange_rate
--      (convert per-unit cost from cost_currency to quotation.base_currency)
--   2. cost_amount_base = cost_rate_base * quantity
--   3. effective_margin_pct = COALESCE(item.margin_pct, quotation.margin_pct)
--   4. selling_rate_base = cost_rate_base * (1 + effective_margin_pct / 100)
--      (apply margin to base-currency cost rate)
--   5. selling_amount_base = selling_rate_base * quantity
--   6. selling_amount_quote = selling_amount_base / quotation.exchange_rate
--      (if base_currency = quote_currency, exchange_rate = 1, no conversion)
--
-- HISTORICAL SNAPSHOT PRINCIPLE:
--   Once a quotation is finalized (sent_to_sales or later),
--   financial values must NOT change due to master data changes.
--   This trigger only fires on INSERT/UPDATE of quotation_items.
--   Quotation version revisions create new quotation rows with new snapshots.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_quotation_item_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
  v_quotation RECORD;
  v_effective_margin_pct NUMERIC(6,3);
  v_cost_rate_base NUMERIC(18,6);
  v_cost_amount_base NUMERIC(18,6);
  v_selling_rate_base NUMERIC(18,6);
  v_selling_amount_base NUMERIC(18,6);
  v_selling_amount_quote NUMERIC(18,6);
BEGIN
  -- Fetch quotation snapshot values
  SELECT
    base_currency,
    quote_currency,
    exchange_rate,
    margin_pct
  INTO v_quotation
  FROM public.quotations
  WHERE id = NEW.quotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation not found: %', NEW.quotation_id;
  END IF;

  -- 1. Convert cost_rate from cost_currency to quotation.base_currency
  -- cost_rate_base = cost_rate * cost_exchange_rate
  v_cost_rate_base := NEW.cost_rate * NEW.cost_exchange_rate;

  -- 2. Calculate cost amount in quotation.base_currency
  v_cost_amount_base := v_cost_rate_base * NEW.quantity;

  -- 3. Determine effective margin (item override or quotation default)
  v_effective_margin_pct := COALESCE(NEW.margin_pct, v_quotation.margin_pct);

  -- 4. Calculate selling rate in base_currency
  -- Apply margin to the BASE-currency cost rate
  v_selling_rate_base := v_cost_rate_base * (1 + v_effective_margin_pct / 100);

  -- 5. Calculate selling amount in base_currency
  v_selling_amount_base := v_selling_rate_base * NEW.quantity;

  -- 6. Convert to quote_currency using quotation's frozen exchange_rate
  -- exchange_rate = base_currency units per 1 quote_currency unit
  -- base → quote = base_amount / exchange_rate
  IF v_quotation.base_currency = v_quotation.quote_currency THEN
    v_selling_amount_quote := v_selling_amount_base;
  ELSE
    v_selling_amount_quote := v_selling_amount_base / v_quotation.exchange_rate;
  END IF;

  -- Assign calculated values to NEW record
  NEW.cost_amount := v_cost_amount_base;
  NEW.selling_rate := v_selling_rate_base;
  NEW.selling_amount_base := v_selling_amount_base;
  NEW.selling_amount_quote := v_selling_amount_quote;

  RETURN NEW;
END;
$$;

CREATE TRIGGER quotation_items_calculate_financials
BEFORE INSERT OR UPDATE ON public.quotation_items
FOR EACH ROW
EXECUTE FUNCTION public.calculate_quotation_item_financials();

-- ============================================================================
-- TRIGGER: UPDATE QUOTATION TOTALS ON ITEM CHANGE
-- ============================================================================
-- All totals are calculated in quotation.base_currency for consistency.
-- total_cost_amount     = SUM(cost_amount) in base_currency
-- total_selling_amount  = SUM(selling_amount_base) in base_currency
-- total_margin_amount   = total_selling_amount - total_cost_amount in base_currency
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_quotation_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
  UPDATE public.quotations
  SET
    total_cost_amount = (
      SELECT COALESCE(SUM(cost_amount), 0)
      FROM public.quotation_items
      WHERE quotation_id = NEW.quotation_id
    ),
    total_selling_amount = (
      SELECT COALESCE(SUM(selling_amount_base), 0)
      FROM public.quotation_items
      WHERE quotation_id = NEW.quotation_id
    ),
    total_margin_amount = (
      SELECT COALESCE(SUM(selling_amount_base - cost_amount), 0)
      FROM public.quotation_items
      WHERE quotation_id = NEW.quotation_id
    ),
    updated_at = NOW()
  WHERE id = NEW.quotation_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER quotation_items_update_totals
AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items
FOR EACH ROW
EXECUTE FUNCTION public.update_quotation_totals();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;

-- ============================================================================
-- END OF MIGRATION 029
-- ============================================================================

COMMIT;