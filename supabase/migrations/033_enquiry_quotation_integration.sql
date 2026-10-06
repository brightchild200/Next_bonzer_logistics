-- ============================================================================
-- BONZER LOGISTICS
-- 033 - ENQUIRY QUOTATION INTEGRATION
-- ============================================================================
-- PURPOSE
--   Link Enquiry to Quotation workflow:
--   1. Add latest_quotation_id to enquiries for quick lookup (optional but useful)
--   2. Add status transition triggers (enquiry.status = 'quoted' when quotation sent)
--   3. Add status transition triggers (enquiry.status = 'won' when quotation approved)
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD LATEST_QUOTATION_ID TO ENQUIRIES (Optional convenience FK)
-- ============================================================================

ALTER TABLE public.enquiries
ADD COLUMN IF NOT EXISTS latest_quotation_id UUID
  REFERENCES public.quotations(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_enquiries_latest_quotation_id
  ON public.enquiries (latest_quotation_id);

-- ============================================================================
-- TRIGGER: UPDATE ENQUIRY STATUS WHEN QUOTATION SENT/APPROVED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_enquiry_on_quotation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
  -- Only act on status changes that matter
  IF NEW.status = 'sent_to_sales' AND OLD.status != 'sent_to_sales' THEN
    UPDATE public.enquiries
    SET
      status = 'quoted',
      quoted_at = NOW(),
      latest_quotation_id = NEW.id,
      updated_at = NOW()
    WHERE id = NEW.enquiry_id;

    -- Log activity
    PERFORM public.log_activity(
      'enquiry',
      NEW.enquiry_id,
      'status_changed',
      'Quotation sent to salesperson',
      JSONB_BUILD_OBJECT('status', OLD.status),
      JSONB_BUILD_OBJECT('status', 'quoted')
    );

  ELSIF NEW.status = 'customer_approved' AND OLD.status != 'customer_approved' THEN
    UPDATE public.enquiries
    SET
      status = 'won',
      won_at = NOW(),
      latest_quotation_id = NEW.id,
      updated_at = NOW()
    WHERE id = NEW.enquiry_id;

    -- Log activity
    PERFORM public.log_activity(
      'enquiry',
      NEW.enquiry_id,
      'status_changed',
      'Customer approved quotation',
      JSONB_BUILD_OBJECT('status', OLD.status),
      JSONB_BUILD_OBJECT('status', 'won')
    );

    PERFORM public.log_activity(
      'quotation',
      NEW.id,
      'approved',
      'Quotation approved by customer',
      JSONB_BUILD_OBJECT('status', OLD.status),
      JSONB_BUILD_OBJECT('status', 'customer_approved')
    );

  ELSIF NEW.status = 'revision_requested' AND OLD.status != 'revision_requested' THEN
    -- Log activity but don't change enquiry status
    PERFORM public.log_activity(
      'quotation',
      NEW.id,
      'revision_requested',
      'Customer requested revision',
      JSONB_BUILD_OBJECT('status', OLD.status),
      JSONB_BUILD_OBJECT('status', 'revision_requested')
    );

  ELSIF NEW.status = 'customer_approved' AND OLD.status = 'customer_approved' THEN
    -- Already approved, no-op
    NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER quotations_update_enquiry_status
AFTER UPDATE OF status ON public.quotations
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_enquiry_on_quotation_change();

-- ============================================================================
-- TRIGGER: UPDATE LATEST_QUOTATION_ID ON NEW QUOTATION CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_latest_quotation_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
  UPDATE public.enquiries
  SET
    latest_quotation_id = NEW.id,
    updated_at = NOW()
  WHERE id = NEW.enquiry_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER quotations_set_latest_on_create
AFTER INSERT ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.set_latest_quotation_on_create();

-- ============================================================================
-- END OF MIGRATION 033
-- ============================================================================

COMMIT;