-- ============================================================================
-- BONZER LOGISTICS
-- 011 - CUSTOMER SERVICE WORKFLOW
-- ============================================================================
-- PURPOSE
--   Add the minimal schema needed to support the frozen Customer Service flow:
--   assignment, enquiry lifecycle audit fields, and one-to-one interaction-to-
--   enquiry linkage integrity.
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENQUIRIES: assignment and lifecycle audit
-- ============================================================================

ALTER TABLE public.enquiries
    ADD COLUMN IF NOT EXISTS assigned_customer_service_id UUID,
    ADD COLUMN IF NOT EXISTS assigned_by UUID,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_by UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Attach shared updated_at trigger
DROP TRIGGER IF EXISTS enquiries_set_updated_at ON public.enquiries;
CREATE TRIGGER enquiries_set_updated_at
    BEFORE UPDATE ON public.enquiries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_enquiries_assigned_customer_service'
    ) THEN
        ALTER TABLE public.enquiries
            ADD CONSTRAINT fk_enquiries_assigned_customer_service
            FOREIGN KEY (assigned_customer_service_id)
            REFERENCES public.profiles(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_enquiries_assigned_by'
    ) THEN
        ALTER TABLE public.enquiries
            ADD CONSTRAINT fk_enquiries_assigned_by
            FOREIGN KEY (assigned_by)
            REFERENCES public.profiles(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_enquiries_closed_by'
    ) THEN
        ALTER TABLE public.enquiries
            ADD CONSTRAINT fk_enquiries_closed_by
            FOREIGN KEY (closed_by)
            REFERENCES public.profiles(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_enquiries_assigned_customer_service_status
    ON public.enquiries(assigned_customer_service_id, status);

CREATE INDEX IF NOT EXISTS idx_enquiries_assigned_customer_service_updated_at
    ON public.enquiries(assigned_customer_service_id, updated_at DESC);

-- ============================================================================
-- CUSTOMER INTERACTIONS: enforce one enquiry per interaction
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_customer_interactions_enquiry_id'
    ) THEN
        ALTER TABLE public.customer_interactions
            ADD CONSTRAINT uq_customer_interactions_enquiry_id
            UNIQUE (enquiry_id);
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_created_at
    ON public.customer_interactions(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_followups_interaction_status
    ON public.interaction_followups(interaction_id, status);

COMMIT;