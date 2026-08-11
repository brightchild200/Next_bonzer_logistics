-- ============================================================================
-- BONZER LOGISTICS
-- 021 - ENQUIRY: SHIPPER AND CONSIGNEE LINKS
-- ============================================================================
-- PURPOSE
--   Add optional foreign key links from enquiries to shippers and consignees.
--   These are nullable references to the existing party master tables.
--   No denormalized name/ref columns - those are resolved via joins.
-- ============================================================================

BEGIN;

-- Add shipper_id column
ALTER TABLE public.enquiries
ADD COLUMN IF NOT EXISTS shipper_id UUID
    REFERENCES public.shippers(id)
    ON DELETE SET NULL;

-- Add consignee_id column
ALTER TABLE public.enquiries
ADD COLUMN IF NOT EXISTS consignee_id UUID
    REFERENCES public.consignees(id)
    ON DELETE SET NULL;

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_enquiries_shipper_id
    ON public.enquiries(shipper_id);

CREATE INDEX IF NOT EXISTS idx_enquiries_consignee_id
    ON public.enquiries(consignee_id);

COMMIT;