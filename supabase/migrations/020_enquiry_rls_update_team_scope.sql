-- ============================================================================
-- BONZER LOGISTICS
-- 020 - ENQUIRY RLS: UPDATE POLICY TEAM SCOPE
-- ============================================================================
-- PURPOSE
--   Update the enquiries UPDATE policy to allow Sales Manager team-scope edits,
--   aligning with the approved RBAC behavior:
--     • Admin (enquiry:read_all)                          → all enquiries
--     • Salesperson (enquiry:update_sales_fields)         → own enquiries
--     • Sales Manager (enquiry:update_sales_fields + read_team) → team enquiries
--     • Customer Service (enquiry:update_cs_fields)       → assigned enquiries
-- ============================================================================

BEGIN;

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS enquiries_update ON public.enquiries;

-- ============================================================================
-- UPDATE: Permission-aware updates with team scope for Sales Manager
-- ============================================================================
CREATE POLICY enquiries_update
ON public.enquiries
FOR UPDATE
TO authenticated
USING (
    -- Admin: read_all permission → all enquiries
    public.current_user_has_permission('enquiry:read_all')

    -- Salesperson: update_sales_fields on own enquiries
    OR (
        public.current_user_has_permission('enquiry:update_sales_fields')
        AND owner_id = (SELECT auth.uid())
    )

    -- Sales Manager: update_sales_fields + read_team on team enquiries
    OR (
        public.current_user_has_permission('enquiry:update_sales_fields')
        AND public.current_user_has_permission('enquiry:read_team')
        AND owner_id IN (
            SELECT ur.user_id
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE r.name = 'salesperson'
              AND ur.user_id != (SELECT auth.uid())
        )
    )

    -- Customer Service: update_cs_fields on assigned enquiries
    OR (
        public.current_user_has_permission('enquiry:update_cs_fields')
        AND assigned_customer_service_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    -- Admin: read_all permission → all enquiries
    public.current_user_has_permission('enquiry:read_all')

    -- Salesperson: update_sales_fields on own enquiries
    OR (
        public.current_user_has_permission('enquiry:update_sales_fields')
        AND owner_id = (SELECT auth.uid())
    )

    -- Sales Manager: update_sales_fields + read_team on team enquiries
    OR (
        public.current_user_has_permission('enquiry:update_sales_fields')
        AND public.current_user_has_permission('enquiry:read_team')
        AND owner_id IN (
            SELECT ur.user_id
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE r.name = 'salesperson'
              AND ur.user_id != (SELECT auth.uid())
        )
    )

    -- Customer Service: update_cs_fields on assigned enquiries
    OR (
        public.current_user_has_permission('enquiry:update_cs_fields')
        AND assigned_customer_service_id = (SELECT auth.uid())
    )
);

COMMIT;