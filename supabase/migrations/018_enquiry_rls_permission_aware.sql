-- ============================================================================
-- BONZER LOGISTICS
-- 018 - ENQUIRY RLS: PERMISSION-AWARE
-- ============================================================================
-- PURPOSE
--   Replace owner-scoped RLS with permission-aware policies:
--     • Admin (enquiry:read_all)           → all enquiries
--     • Sales Manager (enquiry:read_team)  → team enquiries
--     • Customer Service (enquiry:read_assigned) → assigned enquiries
--     • Salesperson (enquiry:read_own)     → own enquiries
-- ============================================================================

BEGIN;

-- Add owner_id column if missing (required for ownership-based RLS)
ALTER TABLE public.enquiries
ADD COLUMN IF NOT EXISTS owner_id UUID
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- Backfill owner_id from created_by equivalent if possible
-- For existing rows without owner_id, we cannot determine the creator
-- They will be visible only to Admin (read_all) until manually assigned

-- Drop legacy owner-scoped policies
DROP POLICY IF EXISTS "select_own_enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "insert_own_enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "update_own_enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "delete_own_enquiries" ON public.enquiries;

-- Drop any dev bypass policy
DROP POLICY IF EXISTS "Dev - Allow all authenticated users" ON public.enquiries;

-- ============================================================================
-- SELECT: Permission-aware visibility
-- ============================================================================
CREATE POLICY enquiries_select
ON public.enquiries
FOR SELECT
TO authenticated
USING (
    -- Admin: read_all permission
    public.current_user_has_permission('enquiry:read_all')

    -- Sales Manager: read_team → team members' enquiries
    OR (
        public.current_user_has_permission('enquiry:read_team')
        AND owner_id IN (
            SELECT ur.user_id
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE r.name = 'salesperson'
              AND ur.user_id != (SELECT auth.uid())
        )
    )

    -- Customer Service: read_assigned → enquiries assigned to them
    OR (
        public.current_user_has_permission('enquiry:read_assigned')
        AND assigned_customer_service_id = (SELECT auth.uid())
    )

    -- Salesperson: read_own → own enquiries
    OR (
        public.current_user_has_permission('enquiry:read_own')
        AND owner_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- INSERT: Permission-aware creation
-- ============================================================================
CREATE POLICY enquiries_insert
ON public.enquiries
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_has_permission('enquiry:create')
    AND owner_id = (SELECT auth.uid())
);

-- ============================================================================
-- UPDATE: Permission-aware updates
-- ============================================================================
CREATE POLICY enquiries_update
ON public.enquiries
FOR UPDATE
TO authenticated
USING (
    -- Salesperson: update_sales_fields on own enquiries
    (
        public.current_user_has_permission('enquiry:update_sales_fields')
        AND owner_id = (SELECT auth.uid())
    )

    -- Customer Service: update_cs_fields on assigned enquiries
    OR (
        public.current_user_has_permission('enquiry:update_cs_fields')
        AND assigned_customer_service_id = (SELECT auth.uid())
    )

    -- Admin: full update via read_all
    OR public.current_user_has_permission('enquiry:read_all')
)
WITH CHECK (
    -- Same conditions for WITH CHECK
    (
        public.current_user_has_permission('enquiry:update_sales_fields')
        AND owner_id = (SELECT auth.uid())
    )
    OR (
        public.current_user_has_permission('enquiry:update_cs_fields')
        AND assigned_customer_service_id = (SELECT auth.uid())
    )
    OR public.current_user_has_permission('enquiry:read_all')
);

-- ============================================================================
-- DELETE: Admin only (via read_all)
-- ============================================================================
CREATE POLICY enquiries_delete
ON public.enquiries
FOR DELETE
TO authenticated
USING (
    public.current_user_has_permission('enquiry:read_all')
);

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiries TO authenticated;

COMMIT;