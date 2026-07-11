-- ============================================================
-- BONZER LOGISTICS
-- 001 - CORE IDENTITY AND RBAC
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- PROFILES
-- ============================================================

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  full_name text not null,

  employee_code text unique,

  phone text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


-- ============================================================
-- ROLES
-- ============================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),

  name text not null unique,

  display_name text not null,

  description text,

  priority integer not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create trigger roles_set_updated_at
before update on public.roles
for each row
execute function public.set_updated_at();


-- ============================================================
-- PERMISSIONS
-- ============================================================

create table public.permissions (
  id uuid primary key default gen_random_uuid(),

  name text not null unique,

  category text not null,

  description text,

  created_at timestamptz not null default now()
);


-- ============================================================
-- USER ROLES
-- ============================================================

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  role_id uuid not null
    references public.roles(id)
    on delete cascade,

  assigned_by uuid
    references public.profiles(id)
    on delete set null,

  assigned_at timestamptz not null default now(),

  unique (user_id, role_id)
);


-- ============================================================
-- ROLE PERMISSIONS
-- ============================================================

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),

  role_id uuid not null
    references public.roles(id)
    on delete cascade,

  permission_id uuid not null
    references public.permissions(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique (role_id, permission_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

create index user_roles_user_id_idx
on public.user_roles(user_id);

create index user_roles_role_id_idx
on public.user_roles(role_id);

create index role_permissions_role_id_idx
on public.role_permissions(role_id);

create index role_permissions_permission_id_idx
on public.role_permissions(permission_id);


-- ============================================================
-- SEED ROLES
-- ============================================================

insert into public.roles (
  name,
  display_name,
  description,
  priority
)
values

(
  'admin',
  'Admin',
  'Full system administration access',
  100
),

(
  'sales_manager',
  'Sales Manager',
  'Manages sales teams and team sales activity',
  80
),

(
  'salesperson',
  'Salesperson',
  'Handles customers, interactions, follow-ups and enquiries',
  50
),

(
  'customer_service',
  'Customer Service',
  'Processes assigned enquiries and customer service workflows',
  50
),

(
  'pricing',
  'Pricing',
  'Handles pricing and quotation workflows',
  40
),

(
  'operations',
  'Operations',
  'Handles job execution and operational workflows',
  40
),

(
  'accounts',
  'Accounts',
  'Handles invoicing, payments and accounting workflows',
  40
);


-- ============================================================
-- SEED CORE PERMISSIONS
-- ============================================================

insert into public.permissions (
  name,
  category,
  description
)
values

-- USER MANAGEMENT

(
  'user:create',
  'user',
  'Create system users'
),

(
  'user:read',
  'user',
  'View system users'
),

(
  'user:assign_roles',
  'user',
  'Assign roles to system users'
),

(
  'user:update',
  'user',
  'Update system users'
),

(
  'user:deactivate',
  'user',
  'Deactivate system users'
),


-- CUSTOMER

(
  'customer:create',
  'customer',
  'Create customers'
),

(
  'customer:read_own',
  'customer',
  'View customers created by the current user'
),

(
  'customer:read_team',
  'customer',
  'View customers created by team members'
),

(
  'customer:read_all',
  'customer',
  'View all customers'
),

(
  'customer:update',
  'customer',
  'Update customer information'
),


-- INTERACTION

(
  'interaction:create',
  'interaction',
  'Create customer interactions'
),

(
  'interaction:read_own',
  'interaction',
  'View own customer interactions'
),

(
  'interaction:read_team',
  'interaction',
  'View team customer interactions'
),

(
  'interaction:read_all',
  'interaction',
  'View all customer interactions'
),


-- FOLLOW UPS

(
  'follow_up:create',
  'follow_up',
  'Create customer follow-ups'
),

(
  'follow_up:read_own',
  'follow_up',
  'View own follow-ups'
),

(
  'follow_up:read_team',
  'follow_up',
  'View team follow-ups'
),

(
  'follow_up:read_all',
  'follow_up',
  'View all follow-ups'
),

(
  'follow_up:update_own',
  'follow_up',
  'Update own follow-ups'
),


-- ENQUIRY

(
  'enquiry:create',
  'enquiry',
  'Create enquiries'
),

(
  'enquiry:read_own',
  'enquiry',
  'View own enquiries'
),

(
  'enquiry:read_team',
  'enquiry',
  'View team enquiries'
),

(
  'enquiry:read_assigned',
  'enquiry',
  'View assigned enquiries'
),

(
  'enquiry:read_all',
  'enquiry',
  'View all enquiries'
),

(
  'enquiry:assign_cs',
  'enquiry',
  'Assign a customer service user to an enquiry'
),

(
  'enquiry:update_sales_fields',
  'enquiry',
  'Update salesperson enquiry fields'
),

(
  'enquiry:update_cs_fields',
  'enquiry',
  'Update customer service enquiry fields'
),

(
  'enquiry:convert_job',
  'enquiry',
  'Convert finalized enquiry to job'
),


-- KYC

(
  'kyc:read',
  'kyc',
  'View customer KYC status'
),

(
  'kyc:update',
  'kyc',
  'Update customer KYC information'
),


-- ATTENDANCE

(
  'attendance:check_in',
  'attendance',
  'Check in attendance'
),

(
  'attendance:check_out',
  'attendance',
  'Check out attendance'
),

(
  'attendance:read_own',
  'attendance',
  'View own attendance'
),

(
  'attendance:read_team',
  'attendance',
  'View team attendance'
),

(
  'attendance:read_all',
  'attendance',
  'View all attendance'
),


-- REPORTS

(
  'report:read_own',
  'report',
  'View own reports'
),

(
  'report:read_team',
  'report',
  'View team reports'
),

(
  'report:read_all',
  'report',
  'View all reports'
);


-- ============================================================
-- ADMIN PERMISSIONS
-- ============================================================

insert into public.role_permissions (
  role_id,
  permission_id
)
select
  r.id,
  p.id
from public.roles r
cross join public.permissions p
where r.name = 'admin';


-- ============================================================
-- SALESPERSON PERMISSIONS
-- ============================================================

insert into public.role_permissions (
  role_id,
  permission_id
)
select
  r.id,
  p.id
from public.roles r
join public.permissions p
  on p.name in (
    'customer:create',
    'customer:read_own',
    'customer:update',

    'interaction:create',
    'interaction:read_own',

    'follow_up:create',
    'follow_up:read_own',
    'follow_up:update_own',

    'enquiry:create',
    'enquiry:read_own',
    'enquiry:assign_cs',
    'enquiry:update_sales_fields',

    'kyc:read',
    'kyc:update',

    'attendance:check_in',
    'attendance:check_out',
    'attendance:read_own',

    'report:read_own'
  )
where r.name = 'salesperson';


-- ============================================================
-- SALES MANAGER PERMISSIONS
-- ============================================================

insert into public.role_permissions (
  role_id,
  permission_id
)
select
  r.id,
  p.id
from public.roles r
join public.permissions p
  on p.name in (
    'user:read',

    'customer:create',
    'customer:read_team',
    'customer:update',

    'interaction:create',
    'interaction:read_team',

    'follow_up:create',
    'follow_up:read_team',

    'enquiry:create',
    'enquiry:read_team',
    'enquiry:assign_cs',
    'enquiry:update_sales_fields',
    'enquiry:convert_job',

    'kyc:read',

    'attendance:read_team',

    'report:read_team'
  )
where r.name = 'sales_manager';


-- ============================================================
-- CUSTOMER SERVICE PERMISSIONS
-- ============================================================

insert into public.role_permissions (
  role_id,
  permission_id
)
select
  r.id,
  p.id
from public.roles r
join public.permissions p
  on p.name in (
    'customer:read_all',
    'customer:update',

    'enquiry:read_assigned',
    'enquiry:update_cs_fields',
    'enquiry:convert_job',

    'kyc:read',

    'report:read_own'
  )
where r.name = 'customer_service';


-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles
enable row level security;

alter table public.roles
enable row level security;

alter table public.permissions
enable row level security;

alter table public.user_roles
enable row level security;

alter table public.role_permissions
enable row level security;


-- ============================================================
-- BASIC AUTHENTICATED READ POLICIES
--
-- These are bootstrap policies.
-- Business data RLS will be permission-aware in later migrations.
-- ============================================================

create policy "authenticated_can_read_roles"
on public.roles
for select
to authenticated
using (true);


create policy "authenticated_can_read_permissions"
on public.permissions
for select
to authenticated
using (true);


create policy "users_can_read_own_profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);


create policy "users_can_read_own_roles"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);


create policy "authenticated_can_read_role_permissions"
on public.role_permissions
for select
to authenticated
using (true);