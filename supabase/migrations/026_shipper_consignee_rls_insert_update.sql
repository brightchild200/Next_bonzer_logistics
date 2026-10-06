-- ============================================================
-- BONZER LOGISTICS
-- 026 - SHIPPER AND CONSIGNEE RLS INSERT/UPDATE POLICIES
-- ============================================================
-- PURPOSE
--   Add INSERT and UPDATE RLS policies for shippers and consignees.
--   These use the same permission model as customers (customer:create, customer:update).
-- ============================================================

BEGIN;

-- ============================================================
-- SHIPPERS RLS POLICIES
-- ============================================================

-- Insert policy: allow users with customer:create to insert
create policy "shippers_insert_permission_aware"
  on public.shippers
  for insert
  to authenticated
  with check (
    public.current_user_has_permission('customer:create')
    and created_by = (select auth.uid())
  );

-- Update policy: allow users with customer:update to update
create policy "shippers_update_permission_aware"
  on public.shippers
  for update
  to authenticated
  using (
    public.current_user_has_permission('customer:update')
  )
  with check (
    public.current_user_has_permission('customer:update')
  );

-- ============================================================
-- CONSIGNEES RLS POLICIES
-- ============================================================

-- Insert policy: allow users with customer:create to insert
create policy "consignees_insert_permission_aware"
  on public.consignees
  for insert
  to authenticated
  with check (
    public.current_user_has_permission('customer:create')
    and created_by = (select auth.uid())
  );

-- Update policy: allow users with customer:update to update
create policy "consignees_update_permission_aware"
  on public.consignees
  for update
  to authenticated
  using (
    public.current_user_has_permission('customer:update')
  )
  with check (
    public.current_user_has_permission('customer:update')
  );

-- ============================================================
-- GRANTS
-- ============================================================

grant insert, update on public.shippers to authenticated;
grant insert, update on public.consignees to authenticated;

COMMIT;