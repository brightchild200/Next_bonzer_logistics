-- ============================================================
-- BONZER LOGISTICS
-- 006 - GLOBAL EMPLOYEE CODE SYSTEM
-- ============================================================

-- One globally unique employee code per profile, shared across all roles.
-- Codes stay in the existing zero-padded numeric format.

create sequence if not exists public.employee_code_seq;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where employee_code is not null
      and employee_code ~ '^[0-9]+$'
  ) then
    execute format(
      'select setval(''public.employee_code_seq'', %s, true)',
      coalesce(
        (
          select max(employee_code::bigint)
          from public.profiles
          where employee_code ~ '^[0-9]+$'
        ),
        0
      )
    );
  end if;
end
$$;

create or replace function public.normalize_employee_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  normalized_code text;
begin
  normalized_code := nullif(trim(new.employee_code), '');

  if normalized_code is null then
    normalized_code := lpad(nextval('public.employee_code_seq')::text, 3, '0');
  end if;

  if normalized_code !~ '^[0-9]+$' then
    raise exception 'employee_code must be numeric';
  end if;

  normalized_code := lpad(normalized_code, 3, '0');
  new.employee_code := normalized_code;
  return new;
end;
$$;

drop trigger if exists profiles_normalize_employee_code on public.profiles;

create trigger profiles_normalize_employee_code
before insert or update of employee_code on public.profiles
for each row
execute function public.normalize_employee_code();
