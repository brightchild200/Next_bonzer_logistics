-- ============================================================================
-- BONZER LOGISTICS
-- 009 - CUSTOMER INTERACTIONS RPC
-- ============================================================================
-- PURPOSE
--   • Generate interaction references
--   • Generate follow-up references
--   • Search customers
--   • Get customer interaction summary
--   • Check if enquiry can be created from interaction
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. generate_interaction_reference()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_interaction_reference()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
    SELECT 'INT-' || LPAD(NEXTVAL('public.interaction_ref_seq')::TEXT, 6, '0');
$$;

COMMENT ON FUNCTION public.generate_interaction_reference() IS
'Generates the next human-readable interaction reference using interaction_ref_seq.
Format: INT-000001';

ALTER FUNCTION public.generate_interaction_reference() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.generate_interaction_reference() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_interaction_reference() TO AUTHENTICATED;


-- ============================================================================
-- 2. generate_followup_reference()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_followup_reference()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
    SELECT 'FUP-' || LPAD(NEXTVAL('public.followup_ref_seq')::TEXT, 6, '0');
$$;

COMMENT ON FUNCTION public.generate_followup_reference() IS
'Generates the next human-readable follow-up reference using followup_ref_seq.
Format: FUP-000001';

ALTER FUNCTION public.generate_followup_reference() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.generate_followup_reference() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_followup_reference() TO AUTHENTICATED;


-- ============================================================================
-- 3. search_customers(search_text TEXT, limit_count INTEGER DEFAULT 20)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_customers(
    search_text TEXT,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    customer_id UUID,
    customer_ref TEXT,
    company_name TEXT,
    city TEXT,
    state TEXT,
    contact_person TEXT,
    mobile TEXT,
    email TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
    SELECT
        c.id AS customer_id,
        c.customer_ref,
        c.company_name,
        c.city,
        c.state,
        c.contact_person,
        c.phone AS mobile,
        c.email
    FROM public.customers c
    CROSS JOIN LATERAL (
        SELECT NULLIF(TRIM(search_text), '') AS norm
    ) n
    WHERE c.is_active = TRUE
      AND (
          n.norm IS NULL
          OR c.customer_ref ILIKE '%' || n.norm || '%'
          OR c.company_name ILIKE '%' || n.norm || '%'
          OR c.contact_person ILIKE '%' || n.norm || '%'
          OR c.phone ILIKE '%' || n.norm || '%'
          OR c.email ILIKE '%' || n.norm || '%'
          OR c.gst_number ILIKE '%' || n.norm || '%'
          OR c.pan_number ILIKE '%' || n.norm || '%'
      )
    ORDER BY c.company_name
    LIMIT GREATEST(1, LEAST(limit_count, 100));
$$;

COMMENT ON FUNCTION public.search_customers(TEXT, INTEGER) IS
'Searches active customers by customer_ref, company_name, contact_person, mobile, email, GST, or PAN.
Case-insensitive partial match. Returns active customers ordered by company_name.
Limit defaults to 20, capped at 100.';

ALTER FUNCTION public.search_customers(TEXT, INTEGER) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.search_customers(TEXT, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_customers(TEXT, INTEGER) TO AUTHENTICATED;


-- ============================================================================
-- 4. get_customer_interaction_summary(customer_uuid UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_customer_interaction_summary(
    customer_uuid UUID
)
RETURNS TABLE (
    total_interactions BIGINT,
    open_followups BIGINT,
    completed_followups BIGINT,
    latest_interaction_at TIMESTAMPTZ,
    latest_outcome TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
    SELECT
        COALESCE(interaction_stats.total_interactions, 0) AS total_interactions,
        COALESCE(followup_stats.open_followups, 0) AS open_followups,
        COALESCE(followup_stats.completed_followups, 0) AS completed_followups,
        interaction_stats.latest_interaction_at,
        interaction_stats.latest_outcome
    FROM (
        SELECT
            COUNT(*) AS total_interactions,
            MAX(ci.interaction_at) AS latest_interaction_at,
            (
                SELECT io.name
                FROM public.customer_interactions ci2
                JOIN public.interaction_outcomes io ON io.id = ci2.interaction_outcome_id
                WHERE ci2.customer_id = customer_uuid
                  AND ci2.is_active = TRUE
                ORDER BY ci2.interaction_at DESC
                LIMIT 1
            ) AS latest_outcome
        FROM public.customer_interactions ci
        WHERE ci.customer_id = customer_uuid
          AND ci.is_active = TRUE
    ) interaction_stats
    CROSS JOIN LATERAL (
        SELECT
            COUNT(*) FILTER (WHERE ifu.status <> 'Completed') AS open_followups,
            COUNT(*) FILTER (WHERE ifu.status = 'Completed') AS completed_followups
        FROM public.interaction_followups ifu
        JOIN public.customer_interactions ci ON ci.id = ifu.interaction_id
        WHERE ci.customer_id = customer_uuid
          AND ci.is_active = TRUE
          AND ifu.is_active = TRUE
    ) followup_stats;
$$;

COMMENT ON FUNCTION public.get_customer_interaction_summary(UUID) IS
'Returns interaction summary for a customer:
- total_interactions: count of active interactions
- open_followups: count of non-completed follow-ups
- completed_followups: count of completed follow-ups
- latest_interaction_at: timestamp of most recent interaction
- latest_outcome: outcome name of most recent interaction';

ALTER FUNCTION public.get_customer_interaction_summary(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_customer_interaction_summary(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_customer_interaction_summary(UUID) TO AUTHENTICATED;


-- ============================================================================
-- 5. can_create_enquiry(interaction_uuid UUID)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_create_enquiry(
    interaction_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.customer_interactions ci
        WHERE ci.id = interaction_uuid
          AND ci.is_active = TRUE
          AND ci.enquiry_id IS NULL
    ) INTO result;
    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.can_create_enquiry(UUID) IS
'Returns TRUE only when:
- interaction exists
- interaction is active (is_active = TRUE)
- enquiry_id IS NULL (not yet converted to enquiry)';

ALTER FUNCTION public.can_create_enquiry(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.can_create_enquiry(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_create_enquiry(UUID) TO AUTHENTICATED;

COMMIT;