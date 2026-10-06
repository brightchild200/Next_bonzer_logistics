-- ============================================================================
-- BONZER LOGISTICS
-- 012 - CUSTOMER INTERACTION ENHANCEMENTS
-- ============================================================================
-- PURPOSE
--   Enhance Customer Interaction module with richer CRM information.
--
--   Adds:
--     • Contact Person details
--     • Interaction Channel
--     • Interaction Duration
--
-- NOTE
--   Attendance is intentionally NOT part of this migration.
-- ============================================================================

BEGIN;

-- ============================================================================
-- INTERACTION CHANNEL ENUM
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'interaction_channel'
    ) THEN
        CREATE TYPE public.interaction_channel AS ENUM (
            'CALL',
            'VISIT',
            'WHATSAPP',
            'EMAIL',
            'MEETING',
            'VIDEO_CALL'
        );
    END IF;
END;
$$;

COMMENT ON TYPE public.interaction_channel IS
'Represents how the customer interaction was conducted.';

-- ============================================================================
-- CUSTOMER INTERACTIONS
-- ============================================================================

ALTER TABLE public.customer_interactions

    ADD COLUMN IF NOT EXISTS contact_person_name TEXT,

    ADD COLUMN IF NOT EXISTS contact_person_mobile TEXT,

    ADD COLUMN IF NOT EXISTS contact_person_email TEXT,

    ADD COLUMN IF NOT EXISTS contact_person_designation TEXT,

    ADD COLUMN IF NOT EXISTS interaction_channel public.interaction_channel
        DEFAULT 'CALL',

    ADD COLUMN IF NOT EXISTS interaction_duration_minutes INTEGER;

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_customer_interactions_duration'
    ) THEN
        ALTER TABLE public.customer_interactions
        ADD CONSTRAINT chk_customer_interactions_duration
        CHECK (
            interaction_duration_minutes IS NULL
            OR interaction_duration_minutes >= 0
        );
    END IF;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.customer_interactions.contact_person_name IS
'Name of the person contacted during this interaction.';

COMMENT ON COLUMN public.customer_interactions.contact_person_mobile IS
'Mobile number of the contact person.';

COMMENT ON COLUMN public.customer_interactions.contact_person_email IS
'Email address of the contact person.';

COMMENT ON COLUMN public.customer_interactions.contact_person_designation IS
'Job designation of the contact person.';

COMMENT ON COLUMN public.customer_interactions.interaction_channel IS
'Channel used for this interaction such as Call, Visit or WhatsApp.';

COMMENT ON COLUMN public.customer_interactions.interaction_duration_minutes IS
'Approximate interaction duration in minutes.';


-- ============================================================================
-- INTERACTION LOCATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interaction_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    interaction_id UUID NOT NULL,

    latitude NUMERIC(10,7) NOT NULL,

    longitude NUMERIC(10,7) NOT NULL,

    accuracy NUMERIC(8,2),

    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    captured_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_interaction_locations_interaction
        FOREIGN KEY (interaction_id)
        REFERENCES public.customer_interactions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_interaction_locations_profile
        FOREIGN KEY (captured_by)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_interaction_locations_latitude
        CHECK (
            latitude >= -90
            AND latitude <= 90
        ),

    CONSTRAINT chk_interaction_locations_longitude
        CHECK (
            longitude >= -180
            AND longitude <= 180
        ),

    CONSTRAINT chk_interaction_locations_accuracy
        CHECK (
            accuracy IS NULL
            OR accuracy >= 0
        )
);

COMMENT ON TABLE public.interaction_locations IS
'Stores GPS coordinates captured during customer interactions for audit purposes.';

COMMENT ON COLUMN public.interaction_locations.interaction_id IS
'Associated customer interaction.';

COMMENT ON COLUMN public.interaction_locations.latitude IS
'Captured latitude.';

COMMENT ON COLUMN public.interaction_locations.longitude IS
'Captured longitude.';

COMMENT ON COLUMN public.interaction_locations.accuracy IS
'GPS accuracy in meters.';

COMMENT ON COLUMN public.interaction_locations.captured_at IS
'Timestamp when GPS location was captured.';

COMMENT ON COLUMN public.interaction_locations.captured_by IS
'Employee who captured the location.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_interaction_locations_interaction
ON public.interaction_locations(interaction_id);

CREATE INDEX IF NOT EXISTS idx_interaction_locations_captured_by
ON public.interaction_locations(captured_by);

CREATE INDEX IF NOT EXISTS idx_interaction_locations_captured_at
ON public.interaction_locations(captured_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.interaction_locations
ENABLE ROW LEVEL SECURITY;

-- Salesperson can insert locations

CREATE POLICY interaction_locations_insert
ON public.interaction_locations
FOR INSERT
TO authenticated
WITH CHECK (
    current_user_has_permission('interaction:create')
);

-- Salesperson can view own/team according to existing permissions

CREATE POLICY interaction_locations_select
ON public.interaction_locations
FOR SELECT
TO authenticated
USING (
    current_user_has_permission('interaction:read')
    OR current_user_has_permission('interaction:read_all')
);

-- Admin / Manager can update if required

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

-- Delete only admins

CREATE POLICY interaction_locations_delete
ON public.interaction_locations
FOR DELETE
TO authenticated
USING (
    current_user_has_permission('interaction:delete_all')
);


-- ============================================================================
-- INTERACTION ATTACHMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interaction_attachments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    interaction_id UUID NOT NULL,

    storage_path TEXT NOT NULL,

    original_name TEXT NOT NULL,

    mime_type TEXT NOT NULL,

    file_size BIGINT NOT NULL,

    uploaded_by UUID NOT NULL,

    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_interaction_attachments_interaction
        FOREIGN KEY (interaction_id)
        REFERENCES public.customer_interactions(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_interaction_attachments_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES public.profiles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_interaction_attachment_file_size
        CHECK (file_size > 0)

);

COMMENT ON TABLE public.interaction_attachments IS
'Stores files uploaded against a customer interaction.';

COMMENT ON COLUMN public.interaction_attachments.storage_path IS
'Path of the file inside the Supabase Storage bucket.';

COMMENT ON COLUMN public.interaction_attachments.original_name IS
'Original filename uploaded by the employee.';

COMMENT ON COLUMN public.interaction_attachments.mime_type IS
'MIME type of uploaded file.';

COMMENT ON COLUMN public.interaction_attachments.file_size IS
'Uploaded file size in bytes.';

COMMENT ON COLUMN public.interaction_attachments.uploaded_by IS
'Employee who uploaded the attachment.';

COMMENT ON COLUMN public.interaction_attachments.uploaded_at IS
'Timestamp when attachment was uploaded.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_interaction_attachments_interaction
ON public.interaction_attachments(interaction_id);

CREATE INDEX IF NOT EXISTS idx_interaction_attachments_uploaded_by
ON public.interaction_attachments(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_interaction_attachments_uploaded_at
ON public.interaction_attachments(uploaded_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.interaction_attachments
ENABLE ROW LEVEL SECURITY;

CREATE POLICY interaction_attachments_insert
ON public.interaction_attachments
FOR INSERT
TO authenticated
WITH CHECK (
    current_user_has_permission('interaction:create')
);

CREATE POLICY interaction_attachments_select
ON public.interaction_attachments
FOR SELECT
TO authenticated
USING (
    current_user_has_permission('interaction:read')
    OR current_user_has_permission('interaction:read_all')
);

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

CREATE POLICY interaction_attachments_delete
ON public.interaction_attachments
FOR DELETE
TO authenticated
USING (
    current_user_has_permission('interaction:delete_all')
);

-- ============================================================================
-- SUPABASE STORAGE
-- ============================================================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'customer-interactions',
    'customer-interactions',
    FALSE,
    10485760, -- 10 MB
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

CREATE POLICY customer_interaction_storage_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'customer-interactions'
    AND (
        current_user_has_permission('interaction:create')
        OR current_user_has_permission('interaction:update')
    )
);

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

CREATE POLICY customer_interaction_storage_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'customer-interactions'
    AND current_user_has_permission('interaction:delete_all')
);

-- ============================================================================
-- FINAL COMMENTS
-- ============================================================================

COMMENT ON TABLE public.interaction_locations IS
'Stores GPS coordinates captured during customer interactions.';

COMMENT ON TABLE public.interaction_attachments IS
'Stores files uploaded against customer interactions.';

COMMIT;