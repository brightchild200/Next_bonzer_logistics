-- ============================================================================
-- Migration: 012_customer_pan_unique.sql
-- Module   : Customer Master
-- Purpose  : Add unique constraint on PAN in customers table
--            (making PAN a hard conflict like GST)
-- ============================================================================

BEGIN;

-- First, check for existing duplicate PANs and report them
DO $$
DECLARE
    v_pan_dupes integer;
BEGIN
    SELECT count(*) INTO v_pan_dupes
    FROM (
        SELECT pan_number
        FROM public.customers
        WHERE pan_number IS NOT NULL
        GROUP BY pan_number
        HAVING count(*) > 1
    ) t;

    IF v_pan_dupes > 0 THEN
        RAISE EXCEPTION
            'Migration 012 aborted: % PAN values have duplicates. '
            || 'Clean up duplicate PANs before applying this migration.',
            v_pan_dupes;
    END IF;

    RAISE NOTICE 'Migration 012 audit passed: no duplicate PAN values found.';
END $$;

-- Add unique constraint on PAN (where PAN is not null)
-- Using a partial unique index to allow multiple NULL values
CREATE UNIQUE INDEX IF NOT EXISTS customers_pan_number_unique
    ON public.customers (pan_number)
    WHERE pan_number IS NOT NULL;

COMMENT ON INDEX public.customers_pan_number_unique
    IS 'Ensures PAN is unique across all customers (hard conflict like GST)';

COMMIT;