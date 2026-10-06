# CS module — what changed

## Hardcoded data removed
- `lib/mock-data.ts` deleted (was unused). `lib/types.ts` no longer contains customers, sales people, countries, ports, modes or charge descriptions.
- The store no longer falls back to fake lists: dropdowns come only from `customer_master`, `sales_persons`, `mode_master`, `port_master`, `description_master`.
- Exchange-rate defaults (83.2 / 90.5 / 105.3) removed — defaults now come from the most recent enquiry in the DB.
- Quotation letterhead (address, GST) and T&C text removed — read from the `companies` row if present; otherwise not shown.
- Header/sidebar user "Aditya Rao / CS Executive" removed — replaced by a "Working as" selector fed from `sales_persons`.
- Track page sample job numbers replaced by the 3 most recent jobs in the DB.
- Job-number generation: mode code from `mode_master.mode_code`, financial year computed from today's date, sequence = max existing + 1 (queried from `jobs`). Enquiry numbers likewise queried from `enquiries`.

## Things that were broken and are now fixed
- Quick DSR auto-save wrote stale text (dropped the last keystroke) and its "Saving… Saved" was a fake timer. Now real, with error + retry, flush-on-blur and flush-on-navigate.
- Dates: `toISOString().slice(0,10)` shifted dates by one day in IST. All calendar dates now use local-time helpers.
- Quotation totals recomputed using the enquiry-level rate instead of the rate actually applied per charge row — now consistent with the form and DB.
- Every write used to fail silently (`console.error` only). All writes now surface success/failure toasts; confirm rolls back the job if the enquiry update fails.
- Documents: files were never uploaded (only the name was saved). Now uploaded to Supabase Storage, openable via signed URL, replaced/removed with the row.
- "Send Alert" only showed a toast. Now opens an email to the customer's address in `customer_master.email`.

## Newly functional
Edit enquiry (Pending only) · confirm-enquiry dialog · form validation · ports filtered by country (and air/sea) · header global search · live notifications (expiring docs, pending enquiries) · connection status + load-error/RLS banner · loading skeletons · edit/delete-confirm for documents · DSR search · tracking search by container/S-Bill/shipper/consignee · print only prints the quotation · CSV export escaping.

## Run
1. Keep your `.env.local` (see `.env.example` for optional overrides).
2. Run `supabase/setup.sql` once in the Supabase SQL editor (storage bucket + policies).
3. `npm install && npm run dev`
