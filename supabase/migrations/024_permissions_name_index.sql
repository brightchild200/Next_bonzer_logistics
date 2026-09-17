-- BONZER LOGISTICS
-- 024 - PERMISSIONS NAME INDEX
-- Supports current_user_has_permission() function performance

CREATE INDEX IF NOT EXISTS permissions_name_idx
ON public.permissions (name);