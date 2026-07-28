-- ============================================================================
-- BONZER LOGISTICS
-- 013 - CUSTOMER INTERACTIONS RLS: SUPPORT READ_OWN
-- ============================================================================
-- PURPOSE
--   Update customer_interactions SELECT policy to support both:
--     • interaction:read_all  → all interactions
--     • interaction:read_own  → only interactions where employee_id = current user
-- ============================================================================

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS customer_interactions_select
ON public.customer_interactions;

-- Create new SELECT policy supporting both READ_ALL and READ_OWN
CREATE POLICY customer_interactions_select
ON public.customer_interactions
FOR SELECT
TO authenticated
USING (
    current_user_has_permission('interaction:read_all')
    OR (
        current_user_has_permission('interaction:read_own')
        AND employee_id = (select auth.uid())
    )
);

COMMIT;