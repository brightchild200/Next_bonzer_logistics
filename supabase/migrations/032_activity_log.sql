-- ============================================================================
-- BONZER LOGISTICS
-- 032 - ACTIVITY LOG (Unified Audit Trail)
-- ============================================================================
-- PURPOSE
--   Single unified activity log for all modules.
--   Replaces scattered console.log and notification-only approach.
-- ============================================================================

BEGIN;

-- ============================================================================
-- ACTIVITY LOG TABLE
-- ============================================================================

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),

  entity_type TEXT NOT NULL,  -- 'enquiry' | 'quotation' | 'vendor' | 'customer' | 'interaction' | 'followup' | 'kyc' | 'job' | 'shipment' | 'invoice'

  entity_id UUID NOT NULL,

  action TEXT NOT NULL,  -- 'created' | 'updated' | 'deleted' | 'sent' | 'approved' | 'rejected' | 'revised' | 'assigned' | 'status_changed' | 'converted' | 'completed'

  description TEXT,

  -- JSON snapshots for diff/display
  old_values JSONB,
  new_values JSONB,

  owner_id UUID NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX activity_log_entity_idx ON public.activity_log (entity_type, entity_id);
CREATE INDEX activity_log_owner_idx ON public.activity_log (owner_id);
CREATE INDEX activity_log_created_idx ON public.activity_log (created_at DESC);
CREATE INDEX activity_log_action_idx ON public.activity_log (action);

-- Composite for common queries
CREATE INDEX activity_log_entity_created_idx ON public.activity_log (entity_type, entity_id, created_at DESC);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Users see activity for entities they have read access to
CREATE POLICY "activity_log_select_permission_aware"
  ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (
    -- Admin sees all (pricing:read_all granted to admin via 028)
    public.current_user_has_permission('pricing:read_all')
    -- Users see their own actions
    OR owner_id = (SELECT auth.uid())
    -- Pricing team sees pricing activity
    OR (
      entity_type IN ('quotation', 'vendor', 'exchange_rate')
      AND public.current_user_has_permission('pricing:read')
    )
    -- Sales team sees enquiry/interaction/followup activity
    OR (
      entity_type IN ('enquiry', 'customer_interaction', 'interaction_followup')
      AND (
        public.current_user_has_permission('enquiry:read_all')
        OR public.current_user_has_permission('enquiry:read_team')
        OR public.current_user_has_permission('enquiry:read_assigned')
        OR public.current_user_has_permission('enquiry:read_own')
      )
    )
    -- Customer interactions/followups
    OR (
      entity_type IN ('customer_interaction', 'interaction_followup')
      AND (
        public.current_user_has_permission('interaction:read_all')
        OR public.current_user_has_permission('interaction:read_team')
        OR public.current_user_has_permission('interaction:read_own')
      )
    )
  );

-- Insert: system/server-side only (via RPC)
-- No direct INSERT policy for users
-- Server actions use SECURITY DEFINER RPC to insert

-- No UPDATE/DELETE policies - audit is immutable

GRANT SELECT ON public.activity_log TO authenticated;

-- ============================================================================
-- RPC: LOG ACTIVITY (Server-side)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_description TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS public.activity_log
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
  v_log public.activity_log;
BEGIN
  -- Only allow from authenticated context
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.activity_log (
    entity_type,
    entity_id,
    action,
    description,
    old_values,
    new_values,
    owner_id
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_action,
    p_description,
    p_old_values,
    p_new_values,
    auth.uid()
  )
  RETURNING * INTO v_log;

  RETURN v_log;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;

-- ============================================================================
-- END OF MIGRATION 032
-- ============================================================================

COMMIT;