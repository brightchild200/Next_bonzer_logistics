  -- ============================================================
  -- BONZER LOGISTICS
  -- 007 - PARTY MASTERS (SHIPPERS & CONSIGNEES)
  -- ============================================================

  -- ============================================================
  -- SEQUENCES FOR REFERENCE GENERATION
  -- ============================================================

  create sequence if not exists public.shippers_seq
    start 1
    increment 1
    minvalue 1
    no maxvalue
    cache 1;

  create sequence if not exists public.consignees_seq
    start 1
    increment 1
    minvalue 1
    no maxvalue
    cache 1;

  -- ============================================================
  -- AUDIT EXISTING CUSTOMER DATA (FAIL-FAST)
  -- ============================================================

  do $$
  declare
    v_pan_violations integer;
    v_gst_violations integer;
    v_pan_gst_mismatch integer;
    v_company_name_dupes integer;
  begin
    -- Count invalid PAN rows
    select count(*) into v_pan_violations
    from public.customers
    where pan_number is not null
      and pan_number !~ '^[A-Z]{5}[0-9]{4}[A-Z]$';

    -- Count invalid GSTIN rows
    select count(*) into v_gst_violations
    from public.customers
    where gst_number is not null
      and gst_number !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$';

    -- Count PAN/GST mismatches (both present but PAN in GSTIN positions 3-12 != PAN)
    select count(*) into v_pan_gst_mismatch
    from public.customers
    where pan_number is not null
      and gst_number is not null
      and upper(pan_number) <> substring(upper(gst_number) from 3 for 10);

    -- Count duplicate normalized company names
    select count(*) into v_company_name_dupes
    from (
      select upper(regexp_replace(trim(company_name), '\s+', ' ', 'g')) as norm_name
      from public.customers
      group by 1
      having count(*) > 1
    ) t;

    -- Fail fast if any violations exist
    if v_pan_violations > 0
      or v_gst_violations > 0
      or v_pan_gst_mismatch > 0
      or v_company_name_dupes > 0
    then
      raise exception
        'Migration 007 aborted: existing customer data violates new constraints. Invalid PAN rows: %, Invalid GSTIN rows: %, PAN/GST mismatches: %, Duplicate normalized company names: %. Clean up violating rows before applying this migration.',
        v_pan_violations,
        v_gst_violations,
        v_pan_gst_mismatch,
        v_company_name_dupes;
    end if;

    raise notice 'Migration 007 audit passed: no constraint violations in existing customers.';
  end $$;

  -- ============================================================
  -- ADD CHECK CONSTRAINTS TO CUSTOMERS (NOW SAFE)
  -- ============================================================

  alter table public.customers
    add constraint customers_pan_format
      check (pan_number is null or pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
    add constraint customers_gst_format
      check (gst_number is null or gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),
    add constraint customers_pan_gst_match
      check (
        pan_number is null
        or gst_number is null
        or substring(upper(gst_number) from 3 for 10) = upper(pan_number)
      );

  -- ============================================================
  -- UNIQUE INDEX ON NORMALIZED COMPANY_NAME (HARD CONFLICT)
  -- ============================================================

  create unique index customers_company_name_norm_unique
    on public.customers (upper(regexp_replace(trim(company_name), '\s+', ' ', 'g')));

  -- ============================================================
  -- SHIPPERS TABLE
  -- ============================================================

  create table public.shippers (
    id uuid primary key default gen_random_uuid(),

    shipper_ref text not null unique
      default 'SHP-' || lpad(nextval('public.shippers_seq')::text, 5, '0'),

    source_customer_id uuid
      references public.customers(id)
      on delete set null,

    company_name text not null,
    contact_person text,
    email text,
    phone text,
    address text,
    city text,
    state text,
    country text default 'India',
    pincode text,

    gst_number text
      constraint shippers_gst_format
      check (gst_number is null or gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),

    pan_number text
      constraint shippers_pan_format
      check (pan_number is null or pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),

    constraint shippers_pan_gst_match
      check (
        pan_number is null
        or gst_number is null
        or substring(upper(gst_number) from 3 for 10) = upper(pan_number)
      ),

    created_by uuid not null
      references public.profiles(id)
      on delete restrict,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create trigger shippers_set_updated_at
  before update on public.shippers
  for each row
  execute function public.set_updated_at();

  create index shippers_source_customer_idx on public.shippers (source_customer_id);
  create index shippers_company_name_idx on public.shippers (company_name);

  -- ============================================================
  -- CONSIGNEES TABLE
  -- ============================================================

  create table public.consignees (
    id uuid primary key default gen_random_uuid(),

    consignee_ref text not null unique
      default 'CON-' || lpad(nextval('public.consignees_seq')::text, 5, '0'),

    source_customer_id uuid
      references public.customers(id)
      on delete set null,

    company_name text not null,
    contact_person text,
    email text,
    phone text,
    address text,
    city text,
    state text,
    country text default 'India',
    pincode text,

    gst_number text
      constraint consignees_gst_format
      check (gst_number is null or gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'),

    pan_number text
      constraint consignees_pan_format
      check (pan_number is null or pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),

    constraint consignees_pan_gst_match
      check (
        pan_number is null
        or gst_number is null
        or substring(upper(gst_number) from 3 for 10) = upper(pan_number)
      ),

    created_by uuid not null
      references public.profiles(id)
      on delete restrict,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create trigger consignees_set_updated_at
  before update on public.consignees
  for each row
  execute function public.set_updated_at();

  create index consignees_source_customer_idx on public.consignees (source_customer_id);
  create index consignees_company_name_idx on public.consignees (company_name);

  -- ============================================================
  -- RLS ON SHIPPERS (MINIMAL: READ-ONLY FOR FUTURE CONTEXTUAL ACCESS)
  -- ============================================================

  alter table public.shippers enable row level security;

  -- Read policy: allow any authenticated user with customer:read (since shippers are linked to customers)
  -- No direct insert/update policies - creation only via SECURITY DEFINER RPC
  create policy "shippers_select_permission_aware"
    on public.shippers
    for select
    to authenticated
    using (
      public.current_user_has_permission('customer:read')
    );

  -- ============================================================
  -- RLS ON CONSIGNEES (MINIMAL: READ-ONLY FOR FUTURE CONTEXTUAL ACCESS)
  -- ============================================================

  alter table public.consignees enable row level security;

  create policy "consignees_select_permission_aware"
    on public.consignees
    for select
    to authenticated
    using (
      public.current_user_has_permission('customer:read')
    );

  -- ============================================================
  -- GRANTS (SELECT ONLY FOR NEW TABLES)
  -- ============================================================

  grant select on public.shippers to authenticated;
  grant select on public.consignees to authenticated;
  -- ============================================================
  -- TRANSACTIONAL RPC: CREATE_CUSTOMER_WITH_PARTY_RECORDS
  -- ============================================================

  create or replace function public.create_customer_with_party_records(
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
    p_add_as_shipper boolean,
    p_add_as_consignee boolean
  )
  returns jsonb
  language plpgsql
  security definer
  set search_path = ''
  as $$
  declare
    v_user_id uuid := auth.uid();
    v_customer_id uuid;
    v_customer_ref text;
    v_shipper_ref text;
    v_consignee_ref text;
  begin
    -- Derive creator from auth context
    if v_user_id is null then
      raise exception 'Unauthorized: no authenticated user';
    end if;

    -- Enforce customer:create permission
    if not public.current_user_has_permission('customer:create') then
      raise exception 'Insufficient permissions: customer:create required';
    end if;

    -- Normalize inputs (trim + collapse whitespace; NO uppercasing for company_name storage)
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

    -- Insert Customer (preserves cleaned display casing)
    insert into public.customers (
      company_name, contact_person, email, phone, address, city, state, country, pincode,
      gst_number, pan_number, created_by
    ) values (
      p_company_name,
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
    returning id, customer_ref into v_customer_id, v_customer_ref;

    -- Optional Shipper
    if p_add_as_shipper then
      insert into public.shippers (
        source_customer_id, company_name, contact_person, email, phone, address, city, state, country, pincode,
        gst_number, pan_number, created_by
      ) values (
        v_customer_id, p_company_name,
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
      returning shipper_ref into v_shipper_ref;
    end if;

    -- Optional Consignee
    if p_add_as_consignee then
      insert into public.consignees (
        source_customer_id, company_name, contact_person, email, phone, address, city, state, country, pincode,
        gst_number, pan_number, created_by
      ) values (
        v_customer_id, p_company_name,
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
      returning consignee_ref into v_consignee_ref;
    end if;

    return jsonb_build_object(
      'customer_ref', v_customer_ref,
      'shipper_ref', v_shipper_ref,
      'consignee_ref', v_consignee_ref
    );
  end;
  $$;

  -- Grant execute on RPC to authenticated users
  grant execute on function public.create_customer_with_party_records to authenticated;

  -- ============================================================
  -- END OF MIGRATION 007
  -- ============================================================