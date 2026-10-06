-- ============================================================================
-- Migration: 008_customer_interactions.sql
-- Module   : Customer Interactions
-- Phase    : 3.5
-- ============================================================================
-- PURPOSE
--   • Interaction master tables
--   • Interaction reference sequences
--   • Seed system masters
--
-- NOTE
--   Business tables are added in the next section.
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- SEQUENCES
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.interaction_ref_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.followup_ref_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 1;

-- ============================================================================
-- MASTER TABLE
-- interaction_types
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interaction_types
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,

    display_order   INTEGER NOT NULL DEFAULT 0,

    is_system       BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_interaction_type_code
        UNIQUE (code),

    CONSTRAINT uq_interaction_type_name
        UNIQUE (name),

    CONSTRAINT chk_interaction_type_display_order
        CHECK (display_order >= 0)
);

COMMENT ON TABLE public.interaction_types IS
'System and business interaction types.';

COMMENT ON COLUMN public.interaction_types.code IS
'Stable internal identifier. Example: PHONE_CALL';

COMMENT ON COLUMN public.interaction_types.name IS
'User visible display name.';

COMMENT ON COLUMN public.interaction_types.is_system IS
'System seeded record that cannot be deleted.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_interaction_types_active
ON public.interaction_types(is_active);

CREATE INDEX IF NOT EXISTS idx_interaction_types_display_order
ON public.interaction_types(display_order);

-- ============================================================================
-- UPDATED AT TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trg_interaction_types_updated_at
ON public.interaction_types;

CREATE TRIGGER trg_interaction_types_updated_at
BEFORE UPDATE
ON public.interaction_types
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- MASTER TABLE
-- interaction_outcomes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interaction_outcomes
(
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,

    display_order   INTEGER NOT NULL DEFAULT 0,

    is_system       BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_interaction_outcome_code
        UNIQUE (code),

    CONSTRAINT uq_interaction_outcome_name
        UNIQUE (name),

    CONSTRAINT chk_interaction_outcome_display_order
        CHECK (display_order >= 0)
);

COMMENT ON TABLE public.interaction_outcomes IS
'Possible outcomes of a customer interaction.';

CREATE INDEX IF NOT EXISTS idx_interaction_outcomes_active
ON public.interaction_outcomes(is_active);

CREATE INDEX IF NOT EXISTS idx_interaction_outcomes_display_order
ON public.interaction_outcomes(display_order);

DROP TRIGGER IF EXISTS trg_interaction_outcomes_updated_at
ON public.interaction_outcomes;

CREATE TRIGGER trg_interaction_outcomes_updated_at
BEFORE UPDATE
ON public.interaction_outcomes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE public.interaction_types
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.interaction_outcomes
ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SYSTEM SEED DATA
-- ============================================================================

INSERT INTO public.interaction_types
(
    code,
    name,
    display_order
)
VALUES
('PHONE_CALL','Phone Call',1),
('EMAIL','Email',2),
('WHATSAPP','WhatsApp',3),
('MEETING','Meeting',4),
('VIDEO_CALL','Video Call',5),
('WALK_IN','Walk-in',6),
('OTHER','Other',7)
ON CONFLICT (code)
DO NOTHING;

INSERT INTO public.interaction_outcomes
(
    code,
    name,
    display_order
)
VALUES
('INTERESTED','Interested',1),
('NOT_INTERESTED','Not Interested',2),
('CALL_BACK_LATER','Call Back Later',3),
('QUOTATION_REQUESTED','Quotation Requested',4),
('MEETING_SCHEDULED','Meeting Scheduled',5),
('NO_RESPONSE','No Response',6),
('WRONG_CONTACT','Wrong Contact',7),
('CONVERTED_TO_ENQUIRY','Converted To Enquiry',8)
ON CONFLICT (code)
DO NOTHING;

-- ============================================================================
-- END OF PART A
-- ============================================================================

-- ============================================================================
-- CUSTOMER INTERACTIONS
-- ============================================================================
-- Root conversation between Bonzer and a customer.
--
-- One Customer
--      ↓
-- Multiple Interactions
--
-- One Interaction
--      ↓
-- Zero / One Enquiry
--
-- One Interaction
--      ↓
-- Multiple Follow-ups
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_interactions
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    interaction_ref VARCHAR(30) NOT NULL,

    customer_id UUID NOT NULL,

    enquiry_id UUID,

    employee_id UUID NOT NULL,

    interaction_type_id UUID NOT NULL,

    interaction_outcome_id UUID NOT NULL,

    subject VARCHAR(255),

    notes TEXT NOT NULL,

    interaction_at TIMESTAMPTZ NOT NULL,

    created_by UUID NOT NULL,

    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_customer_interactions_ref
        UNIQUE (interaction_ref),

    CONSTRAINT uq_customer_interactions_customer_time_employee
        UNIQUE (customer_id, interaction_at, employee_id),

    CONSTRAINT fk_customer_interactions_customer
        FOREIGN KEY (customer_id)
        REFERENCES public.customers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_customer_interactions_employee
        FOREIGN KEY (employee_id)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_customer_interactions_type
        FOREIGN KEY (interaction_type_id)
        REFERENCES public.interaction_types(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_customer_interactions_outcome
        FOREIGN KEY (interaction_outcome_id)
        REFERENCES public.interaction_outcomes(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_customer_interactions_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_customer_interactions_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

COMMENT ON TABLE public.customer_interactions IS
'Root customer conversations. Every enquiry originates from an interaction.';

COMMENT ON COLUMN public.customer_interactions.interaction_ref IS
'Human readable reference. Example: INT-000001';

COMMENT ON COLUMN public.customer_interactions.enquiry_id IS
'Nullable until converted into an enquiry.';

CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer
ON public.customer_interactions(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_employee
ON public.customer_interactions(employee_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_type
ON public.customer_interactions(interaction_type_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_outcome
ON public.customer_interactions(interaction_outcome_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_date
ON public.customer_interactions(interaction_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_active
ON public.customer_interactions(is_active);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_enquiry
ON public.customer_interactions(enquiry_id);

DROP TRIGGER IF EXISTS trg_customer_interactions_updated_at
ON public.customer_interactions;

CREATE TRIGGER trg_customer_interactions_updated_at
BEFORE UPDATE
ON public.customer_interactions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.customer_interactions
ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- INTERACTION FOLLOWUPS
-- ============================================================================
-- Continuation of a customer interaction.
--
-- One Interaction
--      ↓
-- Multiple Follow-ups
--
-- Assigned to self only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interaction_followups
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    followup_ref VARCHAR(30) NOT NULL,

    interaction_id UUID NOT NULL,

    due_at TIMESTAMPTZ NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'Pending',

    completion_notes TEXT,

    completed_at TIMESTAMPTZ,

    completed_by UUID,

    created_by UUID NOT NULL,

    updated_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_interaction_followups_ref
        UNIQUE (followup_ref),

    CONSTRAINT fk_followups_interaction
        FOREIGN KEY (interaction_id)
        REFERENCES public.customer_interactions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_followups_completed_by
        FOREIGN KEY (completed_by)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_followups_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_followups_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_followup_completion
        CHECK (
            status <> 'Completed'
            OR (
                completion_notes IS NOT NULL
                AND completed_at IS NOT NULL
            )
        )
);

COMMENT ON TABLE public.interaction_followups IS
'Follow-up activities belonging to a customer interaction.';

COMMENT ON COLUMN public.interaction_followups.followup_ref IS
'Human readable reference. Example: FUP-000001';

COMMENT ON COLUMN public.interaction_followups.completion_notes IS
'Mandatory only when follow-up is completed.';

CREATE INDEX IF NOT EXISTS idx_followups_interaction
ON public.interaction_followups(interaction_id);

CREATE INDEX IF NOT EXISTS idx_followups_due
ON public.interaction_followups(due_at);

CREATE INDEX IF NOT EXISTS idx_followups_status
ON public.interaction_followups(status);

CREATE INDEX IF NOT EXISTS idx_followups_created_by
ON public.interaction_followups(created_by);

CREATE INDEX IF NOT EXISTS idx_followups_active
ON public.interaction_followups(is_active);

DROP TRIGGER IF EXISTS trg_interaction_followups_updated_at
ON public.interaction_followups;

CREATE TRIGGER trg_interaction_followups_updated_at
BEFORE UPDATE
ON public.interaction_followups
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.interaction_followups
ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

CREATE POLICY interaction_types_select
ON public.interaction_types
FOR SELECT
TO authenticated
USING (is_active = TRUE);

CREATE POLICY interaction_outcomes_select
ON public.interaction_outcomes
FOR SELECT
TO authenticated
USING (is_active = TRUE);

CREATE POLICY interaction_types_manage
ON public.interaction_types
FOR ALL
TO authenticated
USING (
    current_user_has_permission('customer:update')
)
WITH CHECK (
    current_user_has_permission('customer:update')
);

CREATE POLICY interaction_outcomes_manage
ON public.interaction_outcomes
FOR ALL
TO authenticated
USING (
    current_user_has_permission('customer:update')
)
WITH CHECK (
    current_user_has_permission('customer:update')
);

CREATE POLICY customer_interactions_select
ON public.customer_interactions
FOR SELECT
TO authenticated
USING (
    current_user_has_permission('interaction:read_all')
);

CREATE POLICY customer_interactions_insert
ON public.customer_interactions
FOR INSERT
TO authenticated
WITH CHECK (
    current_user_has_permission('interaction:create')
);

CREATE POLICY customer_interactions_update
ON public.customer_interactions
FOR UPDATE
TO authenticated
USING (
    current_user_has_permission('customer:update')
)
WITH CHECK (
    current_user_has_permission('customer:update')
);

-- No DELETE policy required.

CREATE POLICY interaction_followups_select
ON public.interaction_followups
FOR SELECT
TO authenticated
USING (
    current_user_has_permission('follow_up:read_all')
);

CREATE POLICY interaction_followups_insert
ON public.interaction_followups
FOR INSERT
TO authenticated
WITH CHECK (
    current_user_has_permission('follow_up:create')
);

CREATE POLICY interaction_followups_update
ON public.interaction_followups
FOR UPDATE
TO authenticated
USING (
    current_user_has_permission('follow_up:update_own')
)
WITH CHECK (
    current_user_has_permission('follow_up:update_own')
);

COMMENT ON TABLE public.customer_interactions IS
'Root customer conversations.';

COMMENT ON TABLE public.interaction_followups IS
'Continuation of a customer interaction.';

COMMIT;