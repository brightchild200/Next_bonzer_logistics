-- ============================================================
-- BONZER LOGISTICS
-- 002 - AUTH CONTEXT RPC
-- ============================================================

create or replace function public.get_my_auth_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(

    'profile',
    (
      select jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'employee_code', p.employee_code,
        'phone', p.phone,
        'is_active', p.is_active
      )
      from public.profiles p
      where p.id = (select auth.uid())
    ),

    'roles',
    coalesce(
      (
        select jsonb_agg(
          distinct r.name
        )
        from public.user_roles ur
        join public.roles r
          on r.id = ur.role_id
        where ur.user_id = (select auth.uid())
          and r.is_active = true
      ),
      '[]'::jsonb
    ),

    'permissions',
    coalesce(
      (
        select jsonb_agg(
          distinct p.name
        )
        from public.user_roles ur
        join public.roles r
          on r.id = ur.role_id
        join public.role_permissions rp
          on rp.role_id = r.id
        join public.permissions p
          on p.id = rp.permission_id
        where ur.user_id = (select auth.uid())
          and r.is_active = true
      ),
      '[]'::jsonb
    )

  );
$$;


-- ============================================================
-- RPC ACCESS
-- ============================================================

revoke all
on function public.get_my_auth_context()
from public;

grant execute
on function public.get_my_auth_context()
to authenticated;