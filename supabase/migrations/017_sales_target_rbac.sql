-- ============================================================================
-- BONZER LOGISTICS
-- 017 - SALES TARGET RBAC PERMISSIONS
-- ============================================================================
-- PURPOSE
--   Add target permissions and assign to roles per RBAC matrix.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD TARGET PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (name, category, description)
VALUES
  ('target:create', 'target', 'Create sales targets'),
  ('target:update', 'target', 'Update sales targets'),
  ('target:read_own', 'target', 'View own sales targets'),
  ('target:read_team', 'target', 'View team sales targets'),
  ('target:read_all', 'target', 'View all sales targets')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. ASSIGN TO ROLES
-- ============================================================================

-- Admin: create, update, read_all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.name IN (
    'target:create',
    'target:update',
    'target:read_all'
  )
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sales Manager: create, update, read_team
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.name IN (
    'target:create',
    'target:update',
    'target:read_team'
  )
WHERE r.name = 'sales_manager'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Salesperson: read_own
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.name IN (
    'target:read_own'
  )
WHERE r.name = 'salesperson'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;