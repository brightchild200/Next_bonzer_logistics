-- ============================================================
-- BONZER LOGISTICS
-- 025 - SHIPPER AND CONSIGNEE DIRECT CREATE RPCS
-- ============================================================
-- PURPOSE
--   Add SECURITY DEFINER RPC functions to create shippers and consignees
--   directly (not only via customer creation). These enforce permissions
--   and validation at the database level.
-- ============================================================

BEGIN;

-- ============================================================
-- CREATE_SHIPPER RPC
-- ============================================================

create or replace function public.create_shipper(
  p_company_name text,
  p_contact_person text,
  p_email text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_country text,
  p_pincode text,
  p_gst_number text,
  p_pan_number text,
  p_source_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_shipper_id uuid;
  v_shipper_ref text;
begin
  -- Derive creator from auth context
  if v_user_id is null then
    raise exception 'Unauthorized: no authenticated user';
  end if;

  -- Enforce customer:create permission (shippers are part of customer master domain)
  if not public.current_user_has_permission('customer:create') then
    raise exception 'Insufficient permissions: customer:create required';
  end if;

  -- Normalize inputs
  p_company_name := regexp_replace(trim(coalesce(p_company_name, '')), '\s+', ' ', 'g');
  p_contact_person := nullif(trim(coalesce(p_contact_person, '')), '');
  p_email := lower(trim(coalesce(p_email, '')));
  p_phone := trim(coalesce(p_phone, ''));
  p_address := nullif(trim(coalesce(p_address, '')), '');
  p_city := nullif(trim(coalesce(p_city, '')), '');
  p_state := nullif(trim(coalesce(p_state, '')), '');
  p_country := coalesce(nullif(trim(coalesce(p_country, '')), ''), 'India');
  p_pincode := nullif(trim(coalesce(p_pincode, '')), '');
  p_gst_number := upper(trim(coalesce(p_gst_number, '')));
  p_pan_number := upper(trim(coalesce(p_pan_number, '')));

  -- Validate required company_name
  if p_company_name = '' then
    raise exception 'Company name is required';
  end if;

  -- PAN format validation
  if p_pan_number <> '' and p_pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then
    raise exception 'Invalid PAN format. Expected: AAAAA9999A';
  end if;

  -- GSTIN format validation
  if p_gst_number <> '' and p_gst_number !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$' then
    raise exception 'Invalid GSTIN format. Expected 15-character GSTIN';
  end if;

  -- PAN/GST cross-match: GSTIN positions 3-12 must equal PAN
  if p_pan_number <> '' and p_gst_number <> '' then
    if substring(p_gst_number from 3 for 10) <> p_pan_number then
      raise exception 'PAN in GSTIN (positions 3-12) does not match provided PAN';
    end if;
  end if;

  -- Insert Shipper
  insert into public.shippers (
    source_customer_id, company_name, contact_person, email, phone, address, city, state, country, pincode,
    gst_number, pan_number, created_by
  ) values (
    p_source_customer_id, p_company_name,
    p_contact_person,
    nullif(p_email, ''),
    nullif(p_phone, ''),
    p_address,
    p_city,
    p_state,
    p_country,
    p_pincode,
    nullif(p_gst_number, ''),
    nullif(p_pan_number, ''),
    v_user_id
  )
  returning id, shipper_ref into v_shipper_id, v_shipper_ref;

  return jsonb_build_object(
    'shipper_ref', v_shipper_ref,
    'shipper_id', v_shipper_id
  );
end;
$$;

-- Grant execute on RPC to authenticated users
grant execute on function public.create_shipper to authenticated;

-- ============================================================
-- CREATE_CONSIGNEE RPC
-- ============================================================

create or replace function public.create_consignee(
  p_company_name text,
  p_contact_person text,
  p_email text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_country text,
  p_pincode text,
  p_gst_number text,
  p_pan_number text,
  p_source_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_consignee_id uuid;
  v_consignee_ref text;
begin
  -- Derive creator from auth context
  if v_user_id is null then
    raise exception 'Unauthorized: no authenticated user';
  end if;

  -- Enforce customer:create permission (consignees are part of customer master domain)
  if not public.current_user_has_permission('customer:create') then
    raise exception 'Insufficient permissions: customer:create required';
  end if;

  -- Normalize inputs
  p_company_name := regexp_replace(trim(coalesce(p_company_name, '')), '\s+', ' ', 'g');
  p_contact_person := nullif(trim(coalesce(p_contact_person, '')), '');
  p_email := lower(trim(coalesce(p_email, '')));
  p_phone := trim(coalesce(p_phone, ''));
  p_address := nullif(trim(coalesce(p_address, '')), '');
  p_city := nullif(trim(coalesce(p_city, '')), '');
  p_state := nullif(trim(coalesce(p_state, '')), '');
  p_country := coalesce(nullif(trim(coalesce(p_country, '')), ''), 'India');
  p_pincode := nullif(trim(coalesce(p_pincode, '')), '');
  p_gst_number := upper(trim(coalesce(p_gst_number, '')));
  p_pan_number := upper(trim(coalesce(p_pan_number, '')));

  -- Validate required company_name
  if p_company_name = '' then
    raise exception 'Company name is required';
  end if;

  -- PAN format validation
  if p_pan_number <> '' and p_pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then
    raise exception 'Invalid PAN format. Expected: AAAAA9999A';
  end if;

  -- GSTIN format validation
  if p_gst_number <> '' and p_gst_number !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$' then
    raise exception 'Invalid GSTIN format. Expected 15-character GSTIN';
  end if;

  -- PAN/GST cross-match: GSTIN positions 3-12 must equal PAN
  if p_pan_number <> '' and p_gst_number <> '' then
    if substring(p_gst_number from 3 for 10) <> p_pan_number then
      raise exception 'PAN in GSTIN (positions 3-12) does not match provided PAN';
    end if;
  end if;

  -- Insert Consignee
  insert into public.consignees (
    source_customer_id, company_name, contact_person, email, phone, address, city, state, country, pincode,
    gst_number, pan_number, created_by
  ) values (
    p_source_customer_id, p_company_name,
    p_contact_person,
    nullif(p_email, ''),
    nullif(p_phone, ''),
    p_address,
    p_city,
    p_state,
    p_country,
    p_pincode,
    nullif(p_gst_number, ''),
    nullif(p_pan_number, ''),
    v_user_id
  )
  returning id, consignee_ref into v_consignee_id, v_consignee_ref;

  return jsonb_build_object(
    'consignee_ref', v_consignee_ref,
    'consignee_id', v_consignee_id
  );
end;
$$;

-- Grant execute on RPC to authenticated users
grant execute on function public.create_consignee to authenticated;

COMMIT;