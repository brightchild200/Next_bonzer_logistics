-- ============================================================
-- BONZER LOGISTICS
-- 005 - CUSTOMER MASTER
-- ============================================================

-- ============================================================
-- PERMISSION CHECK FUNCTION FOR RLS
-- ============================================================

create or replace function public.current_user_has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = (select auth.uid())
      and p.name = permission_name
  );
$$;

-- ============================================================
-- CUSTOMER SEQUENCE FOR CUSTOMER_REF GENERATION
-- ============================================================

create sequence public.customers_seq
  start 1
  increment 1
  minvalue 1
  no maxvalue
  cache 1;

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================

create table public.customers (
  id uuid primary key default gen_random_uuid(),

  customer_ref text not null unique
    default 'CUS-' || lpad(nextval('public.customers_seq')::text, 5, '0'),

  company_name text not null,

  contact_person text,

  email text,

  phone text,

  address text,

  city text,

  state text,

  country text default 'India',

  pincode text,

  gst_number text unique
    constraint customers_gst_number_normalized_null
    check (gst_number is null or gst_number <> ''),

  pan_number text,

  kyc_status text not null default 'pending'
    constraint customers_kyc_status_check
    check (kyc_status in ('pending', 'submitted', 'verified', 'rejected')),

  is_active boolean not null default true,

  created_by uuid not null
    references public.profiles(id)
    on delete restrict,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

create index customers_company_name_idx on public.customers (company_name);
create index customers_phone_idx on public.customers (phone);
create index customers_email_idx on public.customers (email);
create index customers_kyc_status_idx on public.customers (kyc_status);
create index customers_is_active_idx on public.customers (is_active);
create index customers_created_by_idx on public.customers (created_by);

-- ============================================================
-- RLS
-- ============================================================

alter table public.customers enable row level security;

-- ============================================================
-- RLS POLICIES (PERMISSION-AWARE)
-- ============================================================

-- Customer Master is global for every role with customer:read.
create policy "customers_select_permission_aware"
on public.customers
for select
to authenticated
using (
  public.current_user_has_permission('customer:read')
);

create policy "customers_insert_permission_aware"
on public.customers
for insert
to authenticated
with check (
  public.current_user_has_permission('customer:create')
  and created_by = (select auth.uid())
);

create policy "customers_update_permission_aware"
on public.customers
for update
to authenticated
using (
  public.current_user_has_permission('customer:update')
  or public.current_user_has_permission('customer:deactivate')
)
with check (
  public.current_user_has_permission('customer:update')
  or (
    public.current_user_has_permission('customer:deactivate')
    and is_active = false
  )
);

-- ============================================================
-- GRANTS
-- ============================================================

grant select, insert, update on public.customers to authenticated;
grant usage, select on public.customers_seq to authenticated;

-- ============================================================
-- CUSTOMER MASTER PERMISSIONS
-- ============================================================

insert into public.permissions (name, category, description)
values
  ('customer:create', 'customer', 'Create customers'),
  ('customer:read', 'customer', 'View and search the global customer master'),
  ('customer:update', 'customer', 'Update customer information'),
  ('customer:deactivate', 'customer', 'Deactivate customers')
on conflict (name) do nothing;

-- ============================================================
-- ROLE PERMISSION ASSIGNMENTS
-- ============================================================

-- ADMIN + SALES MANAGER: create/read/update/deactivate
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('admin', 'sales_manager')
  and p.name in (
    'customer:create',
    'customer:read',
    'customer:update',
    'customer:deactivate'
  )
on conflict (role_id, permission_id) do nothing;

-- SALESPERSON + CUSTOMER SERVICE: create/read/update
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name in ('salesperson', 'customer_service')
  and p.name in (
    'customer:create',
    'customer:read',
    'customer:update'
  )
on conflict (role_id, permission_id) do nothing;

-- PRICING: create/read
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'pricing'
  and p.name in (
    'customer:create',
    'customer:read'
  )
on conflict (role_id, permission_id) do nothing;

-- Operations and Accounts intentionally receive no Customer Master permissions.
