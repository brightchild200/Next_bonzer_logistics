-- ============================================================================
-- BONZER LOGISTICS
-- 010 - CONVERT INTERACTION TO ENQUIRY
-- ============================================================================
-- PURPOSE
--   Convert an eligible customer interaction into a linked enquiry atomically.
-- ============================================================================

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.enquiry_ref_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 1;

CREATE OR REPLACE FUNCTION public.generate_enquiry_reference()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
    SELECT 'ENQ-' || LPAD(NEXTVAL('public.enquiry_ref_seq')::TEXT, 6, '0');
$$;

COMMENT ON FUNCTION public.generate_enquiry_reference() IS
'Generates the next human-readable enquiry reference using enquiry_ref_seq.
Format: ENQ-000001';

ALTER FUNCTION public.generate_enquiry_reference() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.generate_enquiry_reference() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_enquiry_reference() TO AUTHENTICATED;

CREATE OR REPLACE FUNCTION public.convert_interaction_to_enquiry(
    interaction_uuid UUID
)
RETURNS TABLE (
    enquiry_id UUID,
    enquiry_reference TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
    interaction_record public.customer_interactions%ROWTYPE;
    existing_enquiry_id UUID;
    new_enquiry_id UUID;
    new_enquiry_reference TEXT;
BEGIN
    IF NOT current_user_has_permission('interaction:read_all') THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    SELECT *
    INTO interaction_record
    FROM public.customer_interactions
    WHERE id = interaction_uuid
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Interaction not found';
    END IF;

    IF interaction_record.is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Interaction is inactive';
    END IF;

    IF interaction_record.enquiry_id IS NOT NULL THEN
        RAISE EXCEPTION 'Interaction already converted to enquiry';
    END IF;

    IF NOT public.can_create_enquiry(interaction_uuid) THEN
        RAISE EXCEPTION 'Interaction is not eligible for conversion';
    END IF;

    SELECT e.id
    INTO existing_enquiry_id
    FROM public.enquiries e
    WHERE e.customer_id = interaction_record.customer_id
      AND e.notes = interaction_record.notes
      AND e.customer_name = (
          SELECT c.company_name
          FROM public.customers c
          WHERE c.id = interaction_record.customer_id
      )
    ORDER BY e.created_at DESC
    LIMIT 1;

    IF existing_enquiry_id IS NOT NULL THEN
        UPDATE public.customer_interactions
        SET enquiry_id = existing_enquiry_id,
            interaction_outcome_id = (
                SELECT io.id
                FROM public.interaction_outcomes io
                WHERE io.code = 'CONVERTED_TO_ENQUIRY'
                  AND io.is_active = TRUE
                LIMIT 1
            ),
            updated_at = now()
        WHERE id = interaction_uuid;

        SELECT reference
        INTO new_enquiry_reference
        FROM public.enquiries
        WHERE id = existing_enquiry_id;

        RETURN QUERY SELECT existing_enquiry_id, new_enquiry_reference;
        RETURN;
    END IF;

    SELECT public.generate_enquiry_reference()
    INTO new_enquiry_reference;

    INSERT INTO public.enquiries (
        owner_id,
        reference,
        customer_id,
        customer_name,
        origin,
        destination,
        mode,
        cargo_type,
        weight_kg,
        volume_cbm,
        incoterm,
        status,
        expected_shipment_date,
        notes
    )
    VALUES (
        interaction_record.created_by,
        new_enquiry_reference,
        interaction_record.customer_id,
        (
            SELECT c.company_name
            FROM public.customers c
            WHERE c.id = interaction_record.customer_id
        ),
        NULL,
        NULL,
        'sea',
        NULL,
        NULL,
        NULL,
        NULL,
        'new',
        NULL,
        interaction_record.notes
    )
    RETURNING id INTO new_enquiry_id;

    UPDATE public.customer_interactions
    SET enquiry_id = new_enquiry_id,
        interaction_outcome_id = (
            SELECT io.id
            FROM public.interaction_outcomes io
            WHERE io.code = 'CONVERTED_TO_ENQUIRY'
              AND io.is_active = TRUE
            LIMIT 1
        ),
        updated_at = now()
    WHERE id = interaction_uuid;

    RETURN QUERY SELECT new_enquiry_id, new_enquiry_reference;
END;
$$;

COMMENT ON FUNCTION public.convert_interaction_to_enquiry(UUID) IS
'Atomically converts an eligible interaction into an enquiry and links the interaction to it.
Prevents duplicate enquiry creation for the same interaction.';

ALTER FUNCTION public.convert_interaction_to_enquiry(UUID) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.convert_interaction_to_enquiry(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.convert_interaction_to_enquiry(UUID) TO AUTHENTICATED;

COMMIT;
