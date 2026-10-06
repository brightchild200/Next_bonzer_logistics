-- ============================================================
-- BONZER LOGISTICS
-- 028 - ADD IS_ACTIVE TO SHIPPERS AND CONSIGNEES
-- ============================================================
-- PURPOSE
--   Add is_active column to shippers and consignees tables for soft delete
--   functionality, matching the pattern used in customers table.
-- ============================================================

BEGIN;

-- ============================================================
-- SHIPPERS TABLE
-- ============================================================

ALTER TABLE public.shippers
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.shippers.is_active IS 'Soft delete flag. When false, shipper is hidden from active lists but retained for referential integrity.';

-- Add index for filtering active shippers
CREATE INDEX IF NOT EXISTS shippers_is_active_idx ON public.shippers (is_active);

-- ============================================================
-- CONSIGNEES TABLE
-- ============================================================

ALTER TABLE public.consignees
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.consignees.is_active IS 'Soft delete flag. When false, consignee is hidden from active lists but retained for referential integrity.';

-- Add index for filtering active consignees
CREATE INDEX IF NOT EXISTS consignees_is_active_idx ON public.consignees (is_active);

-- ============================================================
-- UPDATE EXISTING RLS POLICIES TO FILTER BY is_active
-- ============================================================

-- Update shippers select policy to only show active shippers by default
DROP POLICY IF EXISTS "shippers_select_permission_aware" ON public.shippers;

CREATE POLICY "shippers_select_permission_aware"
  ON public.shippers
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_permission('customer:read')
    AND is_active = true
  );

-- Update consignees select policy to only show active consignees by default
DROP POLICY IF EXISTS "consignees_select_permission_aware" ON public.consignees;

CREATE POLICY "consignees_select_permission_aware"
  ON public.consignees
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_has_permission('customer:read')
    AND is_active = true
  );

COMMIT;