-- ============================================================================
-- BONZER LOGISTICS
-- 016 - SALESPERSON TARGETS
-- ============================================================================
-- PURPOSE
--   Implement target setting for Salespeople.
--   Admin and Sales Manager can create/update targets.
--   Salesperson can read own targets.
--   Targets are separate from Attendance and Customer Interactions.
-- ============================================================================

BEGIN;

-- ============================================================================
-- TARGET METRIC ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'target_metric'
    ) THEN
        CREATE TYPE public.target_metric AS ENUM (
            'CUSTOMER_INTERACTIONS',
            'ENQUIRIES',
            'JOBS'
        );
    END IF;
END;
$$;

COMMENT ON TYPE public.target_metric IS
'Metric type for salesperson targets.';

-- ============================================================================
-- SALES TARGETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    salesperson_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    metric public.target_metric NOT NULL,

    target_value INTEGER NOT NULL,

    period_start DATE NOT NULL,

    period_end DATE NOT NULL,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    updated_by UUID
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_sales_targets_salesperson_metric_period
        UNIQUE (salesperson_id, metric, period_start, period_end),

    CONSTRAINT chk_sales_targets_target_value
        CHECK (target_value > 0),

    CONSTRAINT chk_sales_targets_period_order
        CHECK (period_end >= period_start)
);

COMMENT ON TABLE public.sales_targets IS
'Sales targets for Salespeople. Admin and Sales Manager manage targets. Salesperson reads own.';

COMMENT ON COLUMN public.sales_targets.salesperson_id IS
'Reference to the salesperson profile.';

COMMENT ON COLUMN public.sales_targets.metric IS
'Target metric: CUSTOMER_INTERACTIONS, ENQUIRIES, or JOBS.';

COMMENT ON COLUMN public.sales_targets.target_value IS
'Target value (must be > 0).';

COMMENT ON COLUMN public.sales_targets.period_start IS
'Start date of target period (inclusive).';

COMMENT ON COLUMN public.sales_targets.period_end IS
'End date of target period (inclusive).';

COMMENT ON COLUMN public.sales_targets.created_by IS
'Admin or Sales Manager who created the target.';

COMMENT ON COLUMN public.sales_targets.updated_by IS
'Admin or Sales Manager who last updated the target.';

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'sales_targets_set_updated_at'
    ) THEN
        CREATE TRIGGER sales_targets_set_updated_at
        BEFORE UPDATE ON public.sales_targets
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_targets_salesperson
ON public.sales_targets(salesperson_id);

CREATE INDEX IF NOT EXISTS idx_sales_targets_metric
ON public.sales_targets(metric);

CREATE INDEX IF NOT EXISTS idx_sales_targets_period
ON public.sales_targets(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_sales_targets_salesperson_metric_period
ON public.sales_targets(salesperson_id, metric, period_start, period_end);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SALES_TARGETS RLS POLICIES
-- ============================================================================

-- Admin and Sales Manager: can INSERT targets for Salespeople
DROP POLICY IF EXISTS sales_targets_insert ON public.sales_targets;
CREATE POLICY sales_targets_insert
ON public.sales_targets
FOR INSERT
TO authenticated
WITH CHECK (
    (
        public.current_user_has_permission('target:create')
        OR public.current_user_has_permission('target:update')
    )
    AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = salesperson_id
          AND r.name = 'salesperson'
    )
    AND created_by = (SELECT auth.uid())
);

-- Admin and Sales Manager: can UPDATE targets
DROP POLICY IF EXISTS sales_targets_update ON public.sales_targets;
CREATE POLICY sales_targets_update
ON public.sales_targets
FOR UPDATE
TO authenticated
USING (
    public.current_user_has_permission('target:update')
)
WITH CHECK (
    public.current_user_has_permission('target:update')
    AND updated_by = (SELECT auth.uid())
);

-- Salesperson: can SELECT own targets
-- Sales Manager: can SELECT team targets
-- Admin: can SELECT all targets
DROP POLICY IF EXISTS sales_targets_select ON public.sales_targets;
CREATE POLICY sales_targets_select
ON public.sales_targets
FOR SELECT
TO authenticated
USING (
    public.current_user_has_permission('target:read_all')
    OR (
        public.current_user_has_permission('target:read_team')
        AND salesperson_id IN (
            SELECT ur.user_id
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = sales_targets.salesperson_id
              AND r.name = 'salesperson'
              AND ur.user_id != (SELECT auth.uid())
        )
    )
    OR (
        public.current_user_has_permission('target:read_own')
        AND salesperson_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.sales_targets TO authenticated;

COMMIT;