-- ============================================================================
-- BONZER LOGISTICS
-- 031 - EXCHANGE RATES (Snapshot History)
-- ============================================================================
-- PURPOSE
--   Store exchange rate history for audit and re-calculation.
--   Quotations snapshot rates at creation; this table provides history.
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXCHANGE RATES TABLE
-- ============================================================================

CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),

  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'  -- 'manual' | 'rbi' | 'api'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One rate per base/quote/date
  UNIQUE (base_currency, quote_currency, effective_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX exchange_rates_base_quote_idx ON public.exchange_rates (base_currency, quote_currency);
CREATE INDEX exchange_rates_effective_date_idx ON public.exchange_rates (effective_date DESC);
CREATE INDEX exchange_rates_source_idx ON public.exchange_rates (source);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Pricing team + Admin can manage; all can read
CREATE POLICY "exchange_rates_select_permission_aware"
  ON public.exchange_rates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "exchange_rates_insert_permission_aware"
  ON public.exchange_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_has_permission('pricing:manage_exchange_rates')
    OR public.current_user_has_permission('pricing:read_all')
  );

CREATE POLICY "exchange_rates_update_permission_aware"
  ON public.exchange_rates
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_has_permission('pricing:manage_exchange_rates')
    OR public.current_user_has_permission('pricing:read_all')
  )
  WITH CHECK (
    public.current_user_has_permission('pricing:manage_exchange_rates')
    OR public.current_user_has_permission('pricing:read_all')
  );

CREATE POLICY "exchange_rates_delete_permission_aware"
  ON public.exchange_rates
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_has_permission('pricing:manage_exchange_rates')
    OR public.current_user_has_permission('pricing:read_all')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exchange_rates TO authenticated;

-- ============================================================================
-- RPC: UPSERT EXCHANGE RATE (for admin/pricing team)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_exchange_rate(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_rate NUMERIC,
  p_effective_date DATE,
  p_source TEXT DEFAULT 'manual'
)
RETURNS public.exchange_rates
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
  v_rate public.exchange_rates;
BEGIN
  IF NOT public.current_user_has_permission('pricing:manage_exchange_rates')
     AND NOT public.current_user_has_permission('pricing:read_all') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  INSERT INTO public.exchange_rates (base_currency, quote_currency, rate, effective_date, source)
  VALUES (UPPER(p_base_currency), UPPER(p_quote_currency), p_rate, p_effective_date, p_source)
  ON CONFLICT (base_currency, quote_currency, effective_date)
  DO UPDATE SET
    rate = EXCLUDED.rate,
    source = EXCLUDED.source
  RETURNING * INTO v_rate;

  RETURN v_rate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_exchange_rate TO authenticated;

-- ============================================================================
-- END OF MIGRATION 031
-- ============================================================================

COMMIT;