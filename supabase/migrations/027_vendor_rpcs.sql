-- ============================================================================
-- BONZER LOGISTICS
-- 027_vendor_rpcs - VENDOR CREATION RPC
-- ============================================================================
-- PURPOSE
--   Transactional SECURITY DEFINER RPC for creating vendors.
--   Mirrors create_customer_with_party_records pattern from 007_party_masters.sql.
-- ============================================================================

BEGIN;

-- ============================================================================
-- TRANSACTIONAL RPC: CREATE VENDOR
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_vendor(
  p_company_name TEXT,
  p_contact_person TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_country TEXT,
  p_pincode TEXT,
  p_gst_number TEXT,
  p_pan_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vendor_id UUID;
  v_vendor_ref TEXT;
BEGIN
  -- Derive creator from auth context
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user';
  END IF;

  -- Enforce vendor:create permission
  IF NOT public.current_user_has_permission('vendor:create') THEN
    RAISE EXCEPTION 'Insufficient permissions: vendor:create required';
  END IF;

  -- Normalize inputs (trim + collapse whitespace; NO uppercasing for company_name storage)
  p_company_name := REGEXP_REPLACE(TRIM(COALESCE(p_company_name, '')), '\s+', ' ', 'g');
  p_contact_person := NULLIF(TRIM(COALESCE(p_contact_person, '')), '');
  p_email := LOWER(TRIM(COALESCE(p_email, '')));
  p_phone := TRIM(COALESCE(p_phone, ''));
  p_address := NULLIF(TRIM(COALESCE(p_address, '')), '');
  p_city := NULLIF(TRIM(COALESCE(p_city, '')), '');
  p_state := NULLIF(TRIM(COALESCE(p_state, '')), '');
  p_country := COALESCE(NULLIF(TRIM(COALESCE(p_country, '')), ''), 'India');
  p_pincode := NULLIF(TRIM(COALESCE(p_pincode, '')), '');
  p_gst_number := UPPER(TRIM(COALESCE(p_gst_number, '')));
  p_pan_number := UPPER(TRIM(COALESCE(p_pan_number, '')));

  -- Validate required company_name
  IF p_company_name = '' THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  -- PAN format validation
  IF p_pan_number <> '' AND p_pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' THEN
    RAISE EXCEPTION 'Invalid PAN format. Expected: AAAAA9999A';
  END IF;

  -- GSTIN format validation
  IF p_gst_number <> '' AND p_gst_number !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$' THEN
    RAISE EXCEPTION 'Invalid GSTIN format. Expected 15-character GSTIN';
  END IF;

  -- PAN/GST cross-match: GSTIN positions 3-12 must equal PAN
  IF p_pan_number <> '' AND p_gst_number <> '' THEN
    IF SUBSTRING(p_gst_number FROM 3 FOR 10) <> p_pan_number THEN
      RAISE EXCEPTION 'PAN in GSTIN (positions 3-12) does not match provided PAN';
    END IF;
  END IF;

  -- Insert Vendor (preserves cleaned display casing)
  INSERT INTO public.vendors (
    company_name, contact_person, email, phone, address, city, state, country, pincode,
    gst_number, pan_number, created_by
  ) VALUES (
    p_company_name,
    p_contact_person,
    NULLIF(p_email, ''),
    NULLIF(p_phone, ''),
    p_address,
    p_city,
    p_state,
    p_country,
    p_pincode,
    NULLIF(p_gst_number, ''),
    NULLIF(p_pan_number, ''),
    v_user_id
  )
  RETURNING id, vendor_ref INTO v_vendor_id, v_vendor_ref;

  RETURN JSONB_BUILD_OBJECT(
    'vendor_ref', v_vendor_ref,
    'vendor_id', v_vendor_id
  );
END;
$$;

-- Grant execute on RPC to authenticated users
GRANT EXECUTE ON FUNCTION public.create_vendor TO authenticated;

-- ============================================================================
-- END OF MIGRATION 027_vendor_rpcs
-- ============================================================================

COMMIT;