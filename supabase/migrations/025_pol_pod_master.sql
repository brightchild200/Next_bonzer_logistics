-- ============================================================
-- BONZER LOGISTICS
-- 025 - POL/POD MASTER LOOKUP + AUTO COUNTRY
-- ============================================================

-- ============================================================
-- COUNTRY MASTER
-- ============================================================

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  iso_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger countries_set_updated_at
before update on public.countries
for each row
execute function public.set_updated_at();

create index countries_name_idx on public.countries (name);
create index countries_iso_code_idx on public.countries (iso_code);

alter table public.countries enable row level security;

create policy "countries_select_permission_aware"
  on public.countries
  for select
  to authenticated
  using (
    public.current_user_has_permission('enquiry:create') or
    public.current_user_has_permission('enquiry:read_assigned') or
    public.current_user_has_permission('enquiry:read_team') or
    public.current_user_has_permission('enquiry:read_all') or
    public.current_user_has_permission('enquiry:read_own')
  );

grant select on public.countries to authenticated;

-- ============================================================
-- PORT MASTER (Unified table for both SEA and AIR ports)
-- Matches CSV: country_name, location_name, location_type, code
-- ============================================================

create table if not exists public.port_master (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null
    references public.countries(id)
    on delete restrict,
  country_name text not null,
  name text not null,
  location_type text not null check (location_type in ('SEA', 'AIR')),
  unlocode text,
  city text,
  state text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, country_id, location_type)
);

create trigger port_master_set_updated_at
before update on public.port_master
for each row
execute function public.set_updated_at();

create index port_master_name_idx on public.port_master (name);
create index port_master_country_idx on public.port_master (country_id);
create index port_master_unlocode_idx on public.port_master (unlocode);
create index port_master_type_idx on public.port_master (location_type);
create index port_master_is_active_idx on public.port_master (is_active);

alter table public.port_master enable row level security;

create policy "port_master_select_permission_aware"
  on public.port_master
  for select
  to authenticated
  using (
    public.current_user_has_permission('enquiry:create') or
    public.current_user_has_permission('enquiry:read_assigned') or
    public.current_user_has_permission('enquiry:read_team') or
    public.current_user_has_permission('enquiry:read_all') or
    public.current_user_has_permission('enquiry:read_own')
  );

grant select on public.port_master to authenticated;

-- ============================================================
-- POL MASTER VIEW (Port of Loading - SEA ports)
-- ============================================================

create or replace view public.pol_master as
select
  id,
  country_id,
  country_name,
  name,
  unlocode as code,
  city,
  state,
  is_active,
  created_at,
  updated_at
from public.port_master
where location_type = 'SEA'
  and is_active = true;

-- ============================================================
-- POD MASTER VIEW (Port of Discharge - SEA ports)
-- ============================================================

create or replace view public.pod_master as
select
  id,
  country_id,
  country_name,
  name,
  unlocode as code,
  city,
  state,
  is_active,
  created_at,
  updated_at
from public.port_master
where location_type = 'SEA'
  and is_active = true;

-- ============================================================
-- ADD POL_ID AND POD_ID TO ENQUIRIES TABLE
-- ============================================================

alter table public.enquiries
  add column if not exists pol_id uuid
    references public.port_master(id)
    on delete set null,
  add column if not exists pod_id uuid
    references public.port_master(id)
    on delete set null;

create index if not exists enquiries_pol_id_idx on public.enquiries (pol_id);
create index if not exists enquiries_pod_id_idx on public.enquiries (pod_id);

-- ============================================================
-- ADD POL_ID AND POD_ID TO SHIPMENTS TABLE (for consistency)
-- ============================================================

alter table public.shipments
  add column if not exists pol_id uuid
    references public.port_master(id)
    on delete set null,
  add column if not exists pod_id uuid
    references public.port_master(id)
    on delete set null;

create index if not exists shipments_pol_id_idx on public.shipments (pol_id);
create index if not exists shipments_pod_id_idx on public.shipments (pod_id);

-- ============================================================
-- SEED INITIAL COUNTRY DATA (minimal - you'll import full list via CSV)
-- ============================================================

insert into public.countries (name, iso_code) values
  ('India', 'IN'),
  ('United Arab Emirates', 'AE'),
  ('Singapore', 'SG'),
  ('China', 'CN'),
  ('Netherlands', 'NL'),
  ('Germany', 'DE'),
  ('United Kingdom', 'GB'),
  ('United States', 'US'),
  ('Hong Kong', 'HK'),
  ('Sri Lanka', 'LK'),
  ('Saudi Arabia', 'SA'),
  ('Qatar', 'QA'),
  ('Oman', 'OM'),
  ('Bahrain', 'BH'),
  ('Kuwait', 'KW'),
  ('Malaysia', 'MY'),
  ('Thailand', 'TH'),
  ('Vietnam', 'VN'),
  ('Indonesia', 'ID'),
  ('Bangladesh', 'BD'),
  ('Pakistan', 'PK'),
  ('Turkey', 'TR'),
  ('Belgium', 'BE'),
  ('France', 'FR'),
  ('Italy', 'IT'),
  ('Spain', 'ES'),
  ('South Korea', 'KR'),
  ('Japan', 'JP'),
  ('Australia', 'AU'),
  ('New Zealand', 'NZ'),
  ('South Africa', 'ZA'),
  ('Brazil', 'BR'),
  ('Mexico', 'MX'),
  ('Canada', 'CA')
on conflict (name) do nothing;

-- ============================================================
-- IMPORT INSTRUCTIONS FOR YOUR CSV FILES
-- ============================================================
-- 
-- 1. Import countries first (from port_master_import.csv or Seaports.csv):
--    SELECT DISTINCT country_name FROM your_csv;
--    Insert into countries (name, iso_code) - map to ISO codes
--
-- 2. Import ports into port_master:
--    INSERT INTO port_master (country_id, country_name, name, location_type, unlocode)
--    SELECT c.id, csv.country_name, csv.location_name, csv.location_type, csv.code
--    FROM your_csv csv
--    JOIN countries c ON c.name = csv.country_name;
--
-- 3. The pol_master and pod_master views will automatically show SEA ports
--    For air freight, query port_master directly with location_type = 'AIR'

-- ============================================================
-- END OF MIGRATION 025
-- ============================================================