# Customer Interactions Module - Media & Location Implementation

## Completed (from architecture inspection)
- [x] Comprehensive architecture inspection report (C1–C5, H1–H5, M1–M5, L1–L4)

## Implementation Tasks

### A. Fix dropdowns (unblock Salesperson)
- [x] Modify `list-interaction-types.ts` permission gate to allow `interaction:create` OR `interaction:read_own` OR `interaction:read_all`
- [x] Modify `list-interaction-outcomes.ts` permission gate similarly
- [x] Modify `list-employees-for-filter.ts` permission gate similarly

### B. Photo upload + preview
- [x] Create `lib/actions/customer-interactions/mutations/create-attachment.ts` server action
- [x] Modify `components/create-interaction-form.tsx` to add photo upload field + preview
- [x] Add reusable image preview/upload UI primitive to `components/ui/data-display.tsx`

### C. Geolocation + LocationIQ reverse-geocode
- [x] Create `lib/actions/customer-interactions/mutations/create-location.ts` server action (store lat/lng + reverse-geocode address)
- [x] Modify `components/create-interaction-form.tsx` to add location capture button + address display

### Migration 014
- [x] Create `supabase/migrations/014_customer_interactions_media_location.sql`
  - Create missing interaction permissions (`interaction:read`, `interaction:update`, `interaction:update_all`, `interaction:delete_all`)
  - Assign to appropriate roles
  - Fix RLS for `interaction_locations` and `interaction_attachments` + storage bucket
  - Add `formatted_address` column to `interaction_locations`

## Verification
- [x] TypeScript typecheck passes for all modified files (create-attachment, create-location, create-interaction-form, data-display, list-interaction-types/outcomes, list-employees-for-filter)
  - Note: pre-existing TS errors exist in `lib/actions/enquiries/*`, `lib/auth/permission-utils.ts`, `lib/nav.ts`, `lib/registry/*` referencing non-existent `PERMISSIONS.ENQUIRY.READ/UPDATE/ASSIGN/CONVERT` — these are unrelated to this module and were present before these changes.
- [ ] Confirm dropdowns populate for Salesperson role (requires migration 014 + permissions assignment)
- [ ] Smoke test photo upload + preview
- [ ] Smoke test location capture + reverse-geocode
