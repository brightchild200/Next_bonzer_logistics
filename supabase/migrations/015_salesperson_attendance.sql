-- ============================================================================
-- BONZER LOGISTICS
-- 015 - SALESPERSON ATTENDANCE
-- ============================================================================
-- PURPOSE
--   Implement attendance tracking for Salesperson role only.
--   Separate from Customer Interactions.
--   GPS captured silently on check-in/check-out, never exposed in UI.
-- ============================================================================

BEGIN;

-- ============================================================================
-- ATTENDANCE STATUS ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'attendance_status'
    ) THEN
        CREATE TYPE public.attendance_status AS ENUM (
            'CHECKED_IN',
            'CHECKED_OUT',
            'ABSENT',
            'ON_LEAVE'
        );
    END IF;
END;
$$;

COMMENT ON TYPE public.attendance_status IS
'Current status of the salesperson attendance record.';

-- ============================================================================
-- EVENT TYPE ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'attendance_event_type'
    ) THEN
        CREATE TYPE public.attendance_event_type AS ENUM (
            'CHECK_IN',
            'CHECK_OUT'
        );
    END IF;
END;
$$;

COMMENT ON TYPE public.attendance_event_type IS
'Type of attendance location event.';

-- ============================================================================
-- SALES ATTENDANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    salesperson_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    attendance_date DATE NOT NULL,

    check_in_time TIMESTAMPTZ,

    check_out_time TIMESTAMPTZ,

    working_minutes INTEGER,

    status public.attendance_status NOT NULL DEFAULT 'ABSENT',

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_sales_attendance_salesperson_date
        UNIQUE (salesperson_id, attendance_date),

    CONSTRAINT chk_sales_attendance_working_minutes
        CHECK (working_minutes IS NULL OR working_minutes >= 0),

    CONSTRAINT chk_sales_attendance_check_out_after_check_in
        CHECK (
            check_out_time IS NULL
            OR check_in_time IS NULL
            OR check_out_time >= check_in_time
        )
);

COMMENT ON TABLE public.sales_attendance IS
'Daily attendance records for Salesperson role. One record per salesperson per day.';

COMMENT ON COLUMN public.sales_attendance.salesperson_id IS
'Reference to the salesperson profile.';

COMMENT ON COLUMN public.sales_attendance.attendance_date IS
'Date of attendance (date portion only).';

COMMENT ON COLUMN public.sales_attendance.check_in_time IS
'Timestamp when salesperson checked in.';

COMMENT ON COLUMN public.sales_attendance.check_out_time IS
'Timestamp when salesperson checked out.';

COMMENT ON COLUMN public.sales_attendance.working_minutes IS
'Total working minutes calculated from check-in to check-out.';

COMMENT ON COLUMN public.sales_attendance.status IS
'Current attendance status: CHECKED_IN, CHECKED_OUT, ABSENT, ON_LEAVE.';

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'sales_attendance_set_updated_at'
    ) THEN
        CREATE TRIGGER sales_attendance_set_updated_at
        BEFORE UPDATE ON public.sales_attendance
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_attendance_salesperson
ON public.sales_attendance(salesperson_id);

CREATE INDEX IF NOT EXISTS idx_sales_attendance_date
ON public.sales_attendance(attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_attendance_status
ON public.sales_attendance(status);

CREATE INDEX IF NOT EXISTS idx_sales_attendance_salesperson_date
ON public.sales_attendance(salesperson_id, attendance_date DESC);

-- ============================================================================
-- SALES ATTENDANCE LOCATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_attendance_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    attendance_id UUID NOT NULL
        REFERENCES public.sales_attendance(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    event_type public.attendance_event_type NOT NULL,

    latitude NUMERIC(10,7) NOT NULL,

    longitude NUMERIC(10,7) NOT NULL,

    accuracy NUMERIC(8,2),

    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_sales_attendance_locations_latitude
        CHECK (latitude >= -90 AND latitude <= 90),

    CONSTRAINT chk_sales_attendance_locations_longitude
        CHECK (longitude >= -180 AND longitude <= 180),

    CONSTRAINT chk_sales_attendance_locations_accuracy
        CHECK (accuracy IS NULL OR accuracy >= 0)
);

COMMENT ON TABLE public.sales_attendance_locations IS
'GPS coordinates captured silently during check-in/check-out for audit purposes. Never exposed in UI.';

COMMENT ON COLUMN public.sales_attendance_locations.attendance_id IS
'Associated attendance record.';

COMMENT ON COLUMN public.sales_attendance_locations.event_type IS
'Whether this location was captured at CHECK_IN or CHECK_OUT.';

COMMENT ON COLUMN public.sales_attendance_locations.latitude IS
'Captured latitude (never displayed to user).';

COMMENT ON COLUMN public.sales_attendance_locations.longitude IS
'Captured longitude (never displayed to user).';

COMMENT ON COLUMN public.sales_attendance_locations.accuracy IS
'GPS accuracy in meters (never displayed to user).';

COMMENT ON COLUMN public.sales_attendance_locations.captured_at IS
'Timestamp when GPS location was captured.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_attendance_locations_attendance
ON public.sales_attendance_locations(attendance_id);

CREATE INDEX IF NOT EXISTS idx_sales_attendance_locations_event_type
ON public.sales_attendance_locations(event_type);

CREATE INDEX IF NOT EXISTS idx_sales_attendance_locations_captured_at
ON public.sales_attendance_locations(captured_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.sales_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_attendance_locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SALES_ATTENDANCE RLS POLICIES
-- ============================================================================

-- Salesperson: can INSERT own attendance (check-in)
DROP POLICY IF EXISTS sales_attendance_insert ON public.sales_attendance;
CREATE POLICY sales_attendance_insert
ON public.sales_attendance
FOR INSERT
TO authenticated
WITH CHECK (
    public.current_user_has_permission('attendance:check_in')
    AND salesperson_id = (SELECT auth.uid())
);

-- Salesperson: can UPDATE own attendance (check-out, working_minutes, status)
DROP POLICY IF EXISTS sales_attendance_update ON public.sales_attendance;
CREATE POLICY sales_attendance_update
ON public.sales_attendance
FOR UPDATE
TO authenticated
USING (
    public.current_user_has_permission('attendance:check_out')
    AND salesperson_id = (SELECT auth.uid())
)
WITH CHECK (
    public.current_user_has_permission('attendance:check_out')
    AND salesperson_id = (SELECT auth.uid())
);

-- Salesperson: can SELECT own attendance
-- Sales Manager: can SELECT team attendance
-- Admin: can SELECT all attendance
DROP POLICY IF EXISTS sales_attendance_select ON public.sales_attendance;
CREATE POLICY sales_attendance_select
ON public.sales_attendance
FOR SELECT
TO authenticated
USING (
    public.current_user_has_permission('attendance:read_all')
    OR (
        public.current_user_has_permission('attendance:read_team')
        AND salesperson_id IN (
            SELECT ur.user_id
            FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = salesperson_id
              AND r.name = 'salesperson'
              AND ur.user_id != (SELECT auth.uid())
        )
    )
    OR (
        public.current_user_has_permission('attendance:read_own')
        AND salesperson_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- SALES_ATTENDANCE_LOCATIONS RLS POLICIES
-- ============================================================================

-- Salesperson: can INSERT location for own attendance events
DROP POLICY IF EXISTS sales_attendance_locations_insert ON public.sales_attendance_locations;
CREATE POLICY sales_attendance_locations_insert
ON public.sales_attendance_locations
FOR INSERT
TO authenticated
WITH CHECK (
    (
        public.current_user_has_permission('attendance:check_in')
        OR public.current_user_has_permission('attendance:check_out')
    )
    AND attendance_id IN (
        SELECT id FROM public.sales_attendance
        WHERE salesperson_id = (SELECT auth.uid())
    )
);

-- Salesperson: can SELECT locations for own attendance
-- Sales Manager: can SELECT locations for team attendance
-- Admin: can SELECT all locations
DROP POLICY IF EXISTS sales_attendance_locations_select ON public.sales_attendance_locations;
CREATE POLICY sales_attendance_locations_select
ON public.sales_attendance_locations
FOR SELECT
TO authenticated
USING (
    public.current_user_has_permission('attendance:read_all')
    OR (
        public.current_user_has_permission('attendance:read_team')
        AND attendance_id IN (
            SELECT id FROM public.sales_attendance sa
            JOIN public.user_roles ur ON ur.user_id = sa.salesperson_id
            JOIN public.roles r ON r.id = ur.role_id
            WHERE r.name = 'salesperson'
              AND sa.salesperson_id != (SELECT auth.uid())
        )
    )
    OR (
        public.current_user_has_permission('attendance:read_own')
        AND attendance_id IN (
            SELECT id FROM public.sales_attendance
            WHERE salesperson_id = (SELECT auth.uid())
        )
    )
);

-- No UPDATE/DELETE on locations - immutable audit trail

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.sales_attendance TO authenticated;
GRANT SELECT, INSERT ON public.sales_attendance_locations TO authenticated;

-- ============================================================================
-- FINAL COMMENTS
-- ============================================================================

COMMENT ON TABLE public.sales_attendance IS
'Salesperson daily attendance. GPS captured silently on check-in/check-out. Never exposed in UI.';

COMMENT ON TABLE public.sales_attendance_locations IS
'Immutable GPS audit trail for attendance check-in/check-out. Never displayed to any user.';

COMMIT;

-- ============================================================================
-- BONZER LOGISTICS
-- 015 - INTERACTION FOLLOW-UPS RLS: SUPPORT READ_OWN
-- ============================================================================
-- PURPOSE
--   Update interaction_followups SELECT policy to support both:
--     • follow_up:read_all  → all follow-ups
--     • follow_up:read_own  → only follow-ups where parent interaction's employee_id = current user
-- ============================================================================

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS interaction_followups_select
ON public.interaction_followups;

-- Create new SELECT policy supporting both READ_ALL and READ_OWN
CREATE POLICY interaction_followups_select
ON public.interaction_followups
FOR SELECT
TO authenticated
USING (
    current_user_has_permission('follow_up:read_all')
    OR (
        current_user_has_permission('follow_up:read_own')
        AND interaction_id IN (
            SELECT id
            FROM public.customer_interactions
            WHERE employee_id = (select auth.uid())
        )
    )
);

COMMIT;