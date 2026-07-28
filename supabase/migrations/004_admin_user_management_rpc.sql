-- ============================================================
-- BONZER LOGISTICS
-- 004 - ADMIN USER MANAGEMENT RPC
-- ============================================================

-- ============================================================
-- REMOVE LEGACY AUTO PROFILE CREATION
-- Admin invite flow now owns profile + role creation.
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user();

drop policy if exists "allow_insert_own_profile"
on public.profiles;


create or replace function public.update_employee(
  target_user_id uuid,
  new_full_name text,
  new_employee_code text,
  new_phone text,
  new_role_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  caller_permissions text[];
  normalized_role_ids uuid[];
  valid_role_count integer;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'Unauthorized';
  end if;

  select coalesce(array_agg(distinct perm.name), array[]::text[])
  into caller_permissions
  from public.user_roles ur
  join public.role_permissions rp
    on rp.role_id = ur.role_id
  join public.permissions perm
    on perm.id = rp.permission_id
  where ur.user_id = caller_id;

  if not (
    'user:update' = any(caller_permissions)
    and
    'user:assign_roles' = any(caller_permissions)
  ) then
    raise exception 'Insufficient permissions';
  end if;

  if target_user_id is null then
    raise exception 'user_id is required';
  end if;

  if nullif(trim(new_full_name), '') is null then
    raise exception 'full_name is required';
  end if;

  if nullif(trim(new_employee_code), '') is null then
    new_employee_code := '';
  end if;

  select array_agg(distinct role_id)
  into normalized_role_ids
  from unnest(new_role_ids) as role_id;

  if normalized_role_ids is null
     or cardinality(normalized_role_ids) = 0 then
    raise exception 'At least one role is required';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
  ) then
    raise exception 'Employee not found';
  end if;

  if nullif(trim(new_employee_code), '') is not null
     and exists (
       select 1
       from public.profiles
       where employee_code = upper(trim(new_employee_code))
         and id <> target_user_id
     ) then
    raise exception 'employee_code already exists';
  end if;

  select count(*)
  into valid_role_count
  from public.roles
  where id = any(normalized_role_ids)
    and is_active = true;

  if valid_role_count <> cardinality(normalized_role_ids) then
    raise exception 'One or more roles are invalid or inactive';
  end if;

  update public.profiles
  set
    full_name = trim(new_full_name),
    employee_code = coalesce(nullif(trim(new_employee_code), ''), employee_code),
    phone = nullif(trim(new_phone), ''),
    updated_at = now()
  where id = target_user_id;

  delete from public.user_roles
  where user_id = target_user_id;

  insert into public.user_roles (
    user_id,
    role_id,
    assigned_by
  )
  select
    target_user_id,
    role_id,
    caller_id
  from unnest(normalized_role_ids) as role_id;
end;
$$;


-- ============================================================
-- RPC ACCESS
-- ============================================================

revoke all
on function public.update_employee(
  uuid,
  text,
  text,
  text,
  uuid[]
)
from public;

grant execute
on function public.update_employee(
  uuid,
  text,
  text,
  text,
  uuid[]
)
to authenticated;
