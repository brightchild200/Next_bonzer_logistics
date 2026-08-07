-- ============================================================================
-- BONZER LOGISTICS
-- 014 - CUSTOMER INTERACTIONS: MEDIA & LOCATION FINALIZATION
-- ============================================================================
-- PURPOSE
--   Finalize the Customer Interaction media + location features:
--     • Create missing interaction permissions referenced by migration 012
--       (interaction:update, interaction:update_all, interaction:delete_all)
--     • Add interaction:read permission for media/location SELECT parity
--     • Add InteractionLocation.formatted_address column
--     • Fix RLS policies on interaction_locations / interaction_attachments
--       and the storage bucket to use permissions that actually exist.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD MISSING PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (name, category, description)
VALUES
  ('interaction:read', 'interaction', 'View customer interaction media and locations'),
  ('interaction:update', 'interaction', 'Update customer interaction media and locations'),
  ('interaction:update_all', 'interaction', 'Update all customer interaction media and locations'),
  ('interaction:delete_all', 'interaction', 'Delete customer interaction media and locations')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. ASSIGN NEW PERMISSIONS TO ROLES
-- ============================================================================

-- Admin already gets every permission (cross join in 001 picks up new rows via
-- explicit grant below to be safe on re-runs).

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.name IN (
    'interaction:read',
    'interaction:update',
    'interaction:update_all',
    'interaction:delete_all'
  )
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Salesperson / Sales Manager: can read media/locations for read-own/team &
-- create (they created the interaction). Grant read + own update scope.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.name IN (
    'interaction:read',
    'interaction:update'
  )
WHERE r.name IN ('salesperson', 'sales_manager', 'customer_service')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 3. ADD formatted_address TO interaction_locations
-- ============================================================================

ALTER TABLE public.interaction_locations
  ADD COLUMN IF NOT EXISTS formatted_address TEXT;

COMMENT ON COLUMN public.interaction_locations.formatted_address IS
'Human-readable address from LocationIQ reverse geocoding.';

-- ============================================================================
-- 4. FIX RLS ON interaction_locations
-- ============================================================================

DROP POLICY IF EXISTS interaction_locations_select
  ON public.interaction_locations;

CREATE POLICY interaction_locations_select
ON public.interaction_locations
FOR SELECT
TO authenticated
USING (
  current_user_has_permission('interaction:read')
  OR current_user_has_permission('interaction:read_all')
);

DROP POLICY IF EXISTS interaction_locations_update
  ON public.interaction_locations;

CREATE POLICY interaction_locations_update
ON public.interaction_locations
FOR UPDATE
TO authenticated
USING (
  current_user_has_permission('interaction:update')
  OR current_user_has_permission('interaction:update_all')
)
WITH CHECK (
  current_user_has_permission('interaction:update')
  OR current_user_has_permission('interaction:update_all')
);

DROP POLICY IF EXISTS interaction_locations_delete
  ON public.interaction_locations;

CREATE POLICY interaction_locations_delete
ON public.interaction_locations
FOR DELETE
TO authenticated
USING (
  current_user_has_permission('interaction:delete_all')
);

-- ============================================================================
-- 5. FIX RLS ON interaction_attachments
-- ============================================================================

DROP POLICY IF EXISTS interaction_attachments_select
  ON public.interaction_attachments;

CREATE POLICY interaction_attachments_select
ON public.interaction_attachments
FOR SELECT
TO authenticated
USING (
  current_user_has_permission('interaction:read')
  OR current_user_has_permission('interaction:read_all')
);

DROP POLICY IF EXISTS interaction_attachments_update
  ON public.interaction_attachments;

CREATE POLICY interaction_attachments_update
ON public.interaction_attachments
FOR UPDATE
TO authenticated
USING (
  current_user_has_permission('interaction:update')
  OR current_user_has_permission('interaction:update_all')
)
WITH CHECK (
  current_user_has_permission('interaction:update')
  OR current_user_has_permission('interaction:update_all')
);

DROP POLICY IF EXISTS interaction_attachments_delete
  ON public.interaction_attachments;

CREATE POLICY interaction_attachments_delete
ON public.interaction_attachments
FOR DELETE
TO authenticated
USING (
  current_user_has_permission('interaction:delete_all')
);

-- ============================================================================
-- 6. FIX STORAGE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS customer_interaction_storage_select
  ON storage.objects;

CREATE POLICY customer_interaction_storage_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-interactions'
  AND (
    current_user_has_permission('interaction:read')
    OR current_user_has_permission('interaction:read_all')
  )
);

DROP POLICY IF EXISTS customer_interaction_storage_update
  ON storage.objects;

CREATE POLICY customer_interaction_storage_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'customer-interactions'
  AND (
    current_user_has_permission('interaction:update')
    OR current_user_has_permission('interaction:update_all')
  )
)
WITH CHECK (
  bucket_id = 'customer-interactions'
);

DROP POLICY IF EXISTS customer_interaction_storage_delete
  ON storage.objects;

CREATE POLICY customer_interaction_storage_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'customer-interactions'
  AND current_user_has_permission('interaction:delete_all')
);

COMMIT;
