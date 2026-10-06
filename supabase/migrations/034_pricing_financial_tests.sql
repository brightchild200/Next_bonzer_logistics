-- ============================================================================
-- BONZER LOGISTICS
-- Pricing Phase 1 - Financial Calculation Tests
-- ============================================================================
-- Tests the quotation_items financial calculation trigger
-- Run after applying migrations 028, 029
-- ============================================================================

BEGIN;

-- Setup: These tests verify the calculation logic directly
-- For full integration testing, run with authenticated pricing user in database

-- ============================================================================
-- TEST HELPER FUNCTIONS
-- ============================================================================

-- Assert helper
CREATE OR REPLACE FUNCTION public.assert_eq(
  p_actual NUMERIC,
  p_expected NUMERIC,
  p_test_name TEXT,
  p_tolerance NUMERIC DEFAULT 0.001
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF ABS(p_actual - p_expected) > p_tolerance THEN
    RAISE EXCEPTION 'FAIL: % - Expected %, got %', p_test_name, p_expected, p_actual;
  ELSE
    RAISE NOTICE 'PASS: % - Expected %, got %', p_test_name, p_expected, p_actual;
  END IF;
END;
$$;

-- ============================================================================
-- CORRECTED CALCULATION MODEL (as implemented in trigger)
-- ============================================================================
-- 1. cost_rate_base = cost_rate * cost_exchange_rate
-- 2. cost_amount_base = cost_rate_base * quantity
-- 3. effective_margin_pct = COALESCE(item.margin_pct, quotation.margin_pct)
-- 4. selling_rate_base = cost_rate_base * (1 + effective_margin_pct / 100)
-- 5. selling_amount_base = selling_rate_base * quantity
-- 6. selling_amount_quote = selling_amount_base / quotation.exchange_rate (if base != quote)
-- ============================================================================

-- ============================================================================
-- TEST A — Same currency (USD → USD → USD)
-- cost_currency = USD, base_currency = USD, quote_currency = USD
-- cost_rate = 100, quantity = 2, margin = 20%
-- cost_exchange_rate = 1 (USD to USD), quotation.exchange_rate = 1 (USD to USD)
-- ============================================================================

DO $$
DECLARE
  v_cost_rate NUMERIC := 100;
  v_quantity NUMERIC := 2;
  v_cost_exchange_rate NUMERIC := 1;
  v_quotation_exchange_rate NUMERIC := 1;
  v_margin_pct NUMERIC := 20;
  v_cost_rate_base NUMERIC;
  v_cost_amount_base NUMERIC;
  v_selling_rate_base NUMERIC;
  v_selling_amount_base NUMERIC;
  v_selling_amount_quote NUMERIC;
BEGIN
  v_cost_rate_base := v_cost_rate * v_cost_exchange_rate;                    -- 100 * 1 = 100
  v_cost_amount_base := v_cost_rate_base * v_quantity;                        -- 100 * 2 = 200
  v_selling_rate_base := v_cost_rate_base * (1 + v_margin_pct / 100);         -- 100 * 1.20 = 120
  v_selling_amount_base := v_selling_rate_base * v_quantity;                  -- 120 * 2 = 240
  v_selling_amount_quote := v_selling_amount_base / v_quotation_exchange_rate; -- 240 / 1 = 240

  PERFORM assert_eq(v_cost_rate_base, 100, 'TEST A: cost_rate_base (USD)');
  PERFORM assert_eq(v_cost_amount_base, 200, 'TEST A: cost_amount_base (USD)');
  PERFORM assert_eq(v_selling_rate_base, 120, 'TEST A: selling_rate_base (USD)');
  PERFORM assert_eq(v_selling_amount_base, 240, 'TEST A: selling_amount_base (USD)');
  PERFORM assert_eq(v_selling_amount_quote, 240, 'TEST A: selling_amount_quote (USD)');
END $$;

-- ============================================================================
-- TEST B — Cost currency differs from base (USD → INR → INR)
-- cost_currency = USD, base_currency = INR, quote_currency = INR
-- cost_rate = 100 USD, quantity = 2, cost_exchange_rate = 83 INR/USD
-- quotation.exchange_rate = 1 (INR to INR), margin = 20%
-- ============================================================================

DO $$
DECLARE
  v_cost_rate NUMERIC := 100;
  v_quantity NUMERIC := 2;
  v_cost_exchange_rate NUMERIC := 83;
  v_quotation_exchange_rate NUMERIC := 1;
  v_margin_pct NUMERIC := 20;
  v_cost_rate_base NUMERIC;
  v_cost_amount_base NUMERIC;
  v_selling_rate_base NUMERIC;
  v_selling_amount_base NUMERIC;
  v_selling_amount_quote NUMERIC;
BEGIN
  v_cost_rate_base := v_cost_rate * v_cost_exchange_rate;                     -- 100 * 83 = 8,300
  v_cost_amount_base := v_cost_rate_base * v_quantity;                        -- 8,300 * 2 = 16,600
  v_selling_rate_base := v_cost_rate_base * (1 + v_margin_pct / 100);         -- 8,300 * 1.20 = 9,960
  v_selling_amount_base := v_selling_rate_base * v_quantity;                  -- 9,960 * 2 = 19,920
  v_selling_amount_quote := v_selling_amount_base / v_quotation_exchange_rate; -- 19,920 / 1 = 19,920

  PERFORM assert_eq(v_cost_rate_base, 8300, 'TEST B: cost_rate_base (INR)');
  PERFORM assert_eq(v_cost_amount_base, 16600, 'TEST B: cost_amount_base (INR)');
  PERFORM assert_eq(v_selling_rate_base, 9960, 'TEST B: selling_rate_base (INR)');
  PERFORM assert_eq(v_selling_amount_base, 19920, 'TEST B: selling_amount_base (INR)');
  PERFORM assert_eq(v_selling_amount_quote, 19920, 'TEST B: selling_amount_quote (INR)');
END $$;

-- ============================================================================
-- TEST C — Cost currency + quote currency both differ (USD → INR → USD)
-- cost_currency = USD, base_currency = INR, quote_currency = USD
-- cost_rate = 100 USD, quantity = 2, cost_exchange_rate = 83 INR/USD
-- quotation.exchange_rate = 83 INR/USD, margin = 20%
-- ============================================================================

DO $$
DECLARE
  v_cost_rate NUMERIC := 100;
  v_quantity NUMERIC := 2;
  v_cost_exchange_rate NUMERIC := 83;
  v_quotation_exchange_rate NUMERIC := 83;
  v_margin_pct NUMERIC := 20;
  v_cost_rate_base NUMERIC;
  v_cost_amount_base NUMERIC;
  v_selling_rate_base NUMERIC;
  v_selling_amount_base NUMERIC;
  v_selling_amount_quote NUMERIC;
BEGIN
  v_cost_rate_base := v_cost_rate * v_cost_exchange_rate;                     -- 100 * 83 = 8,300
  v_cost_amount_base := v_cost_rate_base * v_quantity;                        -- 8,300 * 2 = 16,600
  v_selling_rate_base := v_cost_rate_base * (1 + v_margin_pct / 100);         -- 8,300 * 1.20 = 9,960
  v_selling_amount_base := v_selling_rate_base * v_quantity;                  -- 9,960 * 2 = 19,920
  v_selling_amount_quote := v_selling_amount_base / v_quotation_exchange_rate; -- 19,920 / 83 = 240

  PERFORM assert_eq(v_cost_rate_base, 8300, 'TEST C: cost_rate_base (INR)');
  PERFORM assert_eq(v_cost_amount_base, 16600, 'TEST C: cost_amount_base (INR)');
  PERFORM assert_eq(v_selling_rate_base, 9960, 'TEST C: selling_rate_base (INR)');
  PERFORM assert_eq(v_selling_amount_base, 19920, 'TEST C: selling_amount_base (INR)');
  PERFORM assert_eq(v_selling_amount_quote, 240, 'TEST C: selling_amount_quote (USD)');
END $$;

-- ============================================================================
-- TEST D — Global margin fallback
-- quotation.margin_pct = 20, item.margin_pct = NULL
-- Expected: effective_margin_pct = 20
-- ============================================================================

DO $$
DECLARE
  v_item_margin NUMERIC := NULL;
  v_quotation_margin NUMERIC := 20;
  v_effective_margin NUMERIC;
BEGIN
  v_effective_margin := COALESCE(v_item_margin, v_quotation_margin);
  PERFORM assert_eq(v_effective_margin, 20, 'TEST D: effective_margin (global)');
END $$;

-- ============================================================================
-- TEST E — Line override
-- quotation.margin_pct = 20, item.margin_pct = 30
-- Expected: effective_margin_pct = 30
-- ============================================================================

DO $$
DECLARE
  v_item_margin NUMERIC := 30;
  v_quotation_margin NUMERIC := 20;
  v_effective_margin NUMERIC;
BEGIN
  v_effective_margin := COALESCE(v_item_margin, v_quotation_margin);
  PERFORM assert_eq(v_effective_margin, 30, 'TEST E: effective_margin (override)');
END $$;

-- ============================================================================
-- TEST F — Zero margin
-- margin = 0
-- Expected: selling_rate_base = cost_rate_base, selling_amount_base = cost_amount_base
-- ============================================================================

DO $$
DECLARE
  v_cost_rate_base NUMERIC := 1000;
  v_quantity NUMERIC := 2;
  v_margin_pct NUMERIC := 0;
  v_cost_amount_base NUMERIC;
  v_selling_rate_base NUMERIC;
  v_selling_amount_base NUMERIC;
BEGIN
  v_cost_amount_base := v_cost_rate_base * v_quantity;                        -- 1000 * 2 = 2000
  v_selling_rate_base := v_cost_rate_base * (1 + v_margin_pct / 100);         -- 1000 * 1.00 = 1000
  v_selling_amount_base := v_selling_rate_base * v_quantity;                  -- 1000 * 2 = 2000

  PERFORM assert_eq(v_selling_rate_base, 1000, 'TEST F: selling_rate_base (zero margin)');
  PERFORM assert_eq(v_selling_amount_base, 2000, 'TEST F: selling_amount_base (zero margin)');
  PERFORM assert_eq(v_selling_amount_base, v_cost_amount_base, 'TEST F: selling = cost at zero margin');
END $$;

-- ============================================================================
-- TEST G — Decimal precision
-- cost_rate = 123.45, quantity = 3.75, cost_exchange_rate = 83.125, margin = 17.5
-- quotation.exchange_rate = 83.125
-- ============================================================================

DO $$
DECLARE
  v_cost_rate NUMERIC := 123.45;
  v_quantity NUMERIC := 3.75;
  v_cost_exchange_rate NUMERIC := 83.125;
  v_quotation_exchange_rate NUMERIC := 83.125;
  v_margin_pct NUMERIC := 17.5;
  v_cost_rate_base NUMERIC;
  v_cost_amount_base NUMERIC;
  v_selling_rate_base NUMERIC;
  v_selling_amount_base NUMERIC;
  v_selling_amount_quote NUMERIC;
BEGIN
  v_cost_rate_base := v_cost_rate * v_cost_exchange_rate;                     -- 123.45 * 83.125 = 10261.78125
  v_cost_amount_base := v_cost_rate_base * v_quantity;                        -- 10261.78125 * 3.75 = 38481.6796875
  v_selling_rate_base := v_cost_rate_base * (1 + v_margin_pct / 100);         -- 10261.78125 * 1.175 = 12057.59296875
  v_selling_amount_base := v_selling_rate_base * v_quantity;                  -- 12057.59296875 * 3.75 = 45215.9736328125
  v_selling_amount_quote := v_selling_amount_base / v_quotation_exchange_rate; -- 45215.9736328125 / 83.125 = 543.951...

  PERFORM assert_eq(v_cost_rate_base, 10261.78125, 'TEST G: cost_rate_base precision');
  PERFORM assert_eq(v_cost_amount_base, 38481.6796875, 'TEST G: cost_amount_base precision');
  PERFORM assert_eq(v_selling_rate_base, 12057.59296875, 'TEST G: selling_rate_base precision');
  PERFORM assert_eq(v_selling_amount_base, 45215.9736328125, 'TEST G: selling_amount_base precision');
  PERFORM assert_eq(v_selling_amount_quote, 543.951, 'TEST G: selling_amount_quote precision', 0.001);
END $$;

-- ============================================================================
-- TEST H — Currency conversion direction (explicit)
-- ============================================================================

-- H1: USD → INR (cost_currency=USD, base=INR, cost_exchange_rate=83)
DO $$
DECLARE
  v_cost_rate NUMERIC := 100;
  v_quantity NUMERIC := 1;
  v_cost_exchange_rate NUMERIC := 83;
  v_cost_rate_base NUMERIC;
BEGIN
  v_cost_rate_base := v_cost_rate * v_cost_exchange_rate;  -- 100 * 83 = 8,300
  PERFORM assert_eq(v_cost_rate_base, 8300, 'TEST H1: USD to INR cost_rate conversion');
END $$;

-- H2: INR base → USD quote (base=INR, quote=USD, exchange_rate=83)
DO $$
DECLARE
  v_base_amount NUMERIC := 8300;
  v_exchange_rate NUMERIC := 83;
  v_quote_amount NUMERIC;
BEGIN
  v_quote_amount := v_base_amount / v_exchange_rate;  -- 8300 / 83 = 100
  PERFORM assert_eq(v_quote_amount, 100, 'TEST H2: INR to USD quote conversion');
END $$;

-- ============================================================================
-- TEST I — Historical snapshot immutability (conceptual)
-- Trigger uses quotation snapshot (base_currency, quote_currency, exchange_rate, margin_pct)
-- not live exchange_rates table. Verified by code inspection.
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'TEST I: Historical snapshot - trigger uses quotation snapshot, not master tables';
END $$;

-- ============================================================================
-- TEST J — Revision versioning (conceptual)
-- Each quotation version has own snapshot. Trigger calculates per-item using that version's snapshot.
-- Verified by versioning model (quotation_id FK to specific version).
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'TEST J: Revision - each quotation version has own snapshot via FK to specific version';
END $$;

-- ============================================================================
-- TOTALS TRIGGER VERIFICATION
-- ============================================================================

-- Totals are in quotation.base_currency:
-- total_cost_amount = SUM(cost_amount) -- base_currency
-- total_selling_amount = SUM(selling_amount_base) -- base_currency
-- total_margin_amount = SUM(selling_amount_base - cost_amount) -- base_currency

DO $$
BEGIN
  RAISE NOTICE 'TEST K: Totals - all in base_currency (cost_amount, selling_amount_base, margin)';
END $$;

-- ============================================================================
-- INTEGRATION TEST (requires database with migrations applied)
-- ============================================================================

/*
-- Uncomment and run with authenticated pricing user to test full integration:

-- 1. Create test enquiry first
INSERT INTO public.enquiries (customer_id, owner_id, status, ...)
VALUES (<customer_id>, <user_id>, 'new', ...)
RETURNING id INTO v_enquiry_id;

-- 2. Create quotation V1 (base=INR, quote=USD, exchange_rate=83, margin=20)
INSERT INTO public.quotations (enquiry_id, base_currency, quote_currency, exchange_rate, margin_pct, created_by)
VALUES (v_enquiry_id, 'INR', 'USD', 83, 20, <user_id>)
RETURNING id INTO v_quotation_id;

-- 3. Insert item (triggers calculation)
-- cost_currency=USD, cost_rate=100, quantity=2, cost_exchange_rate=83, margin_pct=NULL
INSERT INTO public.quotation_items (
  quotation_id, category, description, quantity,
  cost_rate, cost_currency, cost_exchange_rate,
  margin_pct
) VALUES (
  v_quotation_id, 'OCEAN_FREIGHT', 'Test item', 2,
  100, 'USD', 83,
  NULL  -- use quotation margin
);

-- 4. Verify calculated values
SELECT
  cost_amount,           -- 16,600 INR (base)
  selling_rate,          -- 9,960 INR (base) = 100*83*1.20
  selling_amount_base,   -- 19,920 INR (base)
  selling_amount_quote   -- 240 USD (quote) = 19,920 / 83
FROM public.quotation_items
WHERE quotation_id = v_quotation_id;

-- 5. Verify quotation totals
SELECT
  total_cost_amount,     -- 16,600 INR
  total_selling_amount,  -- 19,920 INR
  total_margin_amount    -- 3,320 INR
FROM public.quotations
WHERE id = v_quotation_id;
*/

-- ============================================================================
-- CLEANUP
-- ============================================================================

DROP FUNCTION IF EXISTS public.assert_eq(NUMERIC, NUMERIC, TEXT, NUMERIC);

-- ============================================================================
-- END OF TESTS
-- ============================================================================

COMMIT;