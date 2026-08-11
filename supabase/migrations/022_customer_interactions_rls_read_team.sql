-- ============================================================================
-- BONZER LOGISTICS
-- 022 - CUSTOMER INTERACTIONS RLS: SUPPORT READ_TEAM
-- ============================================================================
-- PURPOSE
--   Update customer_interactions SELECT policy to support interaction:read_team
--   matching the established pattern from Attendance, Targets, and Enquiries:
--     - interaction:read_all  -> all interactions
--     - interaction:read_team -> interactions by salesperson-role users (including self)
--     - interaction:read_own  -> only own interactions
-- ============================================================================

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS customer_interactions_select
ON public.customer_interactions;

-- Create new SELECT policy supporting READ_ALL, READ_TEAM, and READ_OWN
CREATE POLICY customer_interactions_select
ON public.customer_interactions
FOR SELECT
TO authenticated
USING (
    current_user_has_permission('interaction:read_all')
    OR (
        current_user_has_permission('interaction:read_team')
        AND employee_id IN (
            SELECT ur.user_id
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE r.name = 'salesperson'
        )
    )
    OR (
        current_user_has_permission('interaction:read_own')
        AND employee_id = (select auth.uid())
    )
);

COMMIT;
