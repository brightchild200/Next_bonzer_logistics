# Bonzer Logistics ERP — Problem & Fix History

## Purpose

This document is the running record of the Bonzer Logistics ERP issues identified during architecture, performance, and codebase audits, including:
- the problem identified
- where it exists
- fixes that were proposed/tried
- what actually worked
- current status
- what remains to be done

This is a historical/project-tracking document. Do not treat every proposed fix as implemented.

---

# 1. Current Performance Baseline

Latest audit status:

- Overall health: Moderate
- Confirmed / outstanding architectural bottlenecks remain
- P0 auth-context deduplication has now been implemented
- Build/typecheck currently have a separate pre-existing `initialPage` prop mismatch in `app/(app)/enquiries/page.tsx`

Important distinction:
- Static audit findings are different from runtime-verified findings.
- Performance numbers must not be treated as measured unless explicitly verified with DevTools, Supabase logs, EXPLAIN ANALYZE, or build/bundle analysis.

---

# 2. P0 — Authentication Context Duplication

## Problem

Multiple Server Actions independently resolve authentication and authorization context:

1. `supabase.auth.getUser()`
2. `supabase.rpc('get_my_auth_context')`
3. permission/context logic
4. actual database query

The previous implementation used an in-memory `Map`:

`authContextCache = new Map<string, AuthContext>()`

This was not reliable as request-scoped caching in a serverless environment.

## Files

- `lib/auth/server-auth.ts`
- Multiple Server Actions under `lib/actions/**`

## Fixes Considered

### Attempt / Previous approach
In-memory Map cache keyed by user ID.

### Result
❌ Not sufficient.

Reason:
- process-level memory is not guaranteed to represent one request
- cache does not reliably deduplicate across request execution paths
- `clearAuthContextCache()` was not useful for serverless request isolation

## Final Fix That Worked

Replaced the in-memory Map with React `cache()`.

Current pattern:

`const getAuthContext = cache(getAuthContextUncached)`

The function has no arguments, so repeated calls in the same request can be memoized.

## Verification

- `npm run lint` → PASS
- `lib/auth/server-auth.ts` compiles without errors
- RBAC behavior unchanged
- authentication behavior unchanged
- no database/RLS changes
- no caller changes required
- no cross-user global cache introduced

## Current Status

✅ FIXED — P0-A complete.

---

# 3. P0 — Middleware Authentication Overhead

## Problem

Middleware currently calls:

`supabase.auth.getUser()`

on matched requests.

Audit concern:
- repeated auth work on navigation
- potentially unnecessary processing for requests that do not require authentication
- Server Actions/API requests may also pass through middleware depending on matcher scope

## Files

- `middleware.ts`
- `lib/db/middleware-edge.ts`

## Proposed Fix

Narrow the middleware matcher and avoid unnecessary authentication processing.

## Current Status

❌ NOT FIXED

No implementation has been attempted yet.

## Next Step

P0-B — inspect matcher scope and implement only after confirming the safest routing behavior.

---

# 4. P0 — RLS Permission Function Performance

## Problem

`current_user_has_permission()` performs joins involving RBAC tables and is used by RLS policies.

Relevant concepts:
- `user_roles`
- `roles`
- `role_permissions`
- `permissions`

Potential concern:
- permission checks may be repeatedly evaluated during row filtering
- cost can scale with examined row count

## Files / Migrations

- `supabase/migrations/005_customer_master.sql`
- `supabase/migrations/018_enquiry_rls_permission_aware.sql`
- `supabase/migrations/008_customer_interactions.sql`
- other RBAC/RLS migrations

## Proposed Fixes

Possible approaches discussed:
1. Add index on `permissions(name)`
2. Optimize permission lookup
3. Consider JWT permission claims
4. Consider alternative/session-scoped permission lookup

## Important Decision

Do NOT rewrite RLS or move permissions into JWT claims yet.

Reason:
- authorization semantics must be preserved
- runtime evidence is required
- `EXPLAIN ANALYZE` should establish the actual bottleneck first

## Current Status

❌ NOT FIXED

🔍 Measurement required before deeper architectural changes.

---

# 5. P0 — Missing `permissions(name)` Index

## Problem

RBAC migration has indexes on foreign-key columns, but audit found no dedicated index on:

`permissions(name)`

The permission function filters by permission name.

## Proposed Fix

Add a database migration with:

`CREATE INDEX ON permissions(name);`

## Current Status

❌ NOT IMPLEMENTED

## Important

Do not apply until the project/database change process confirms the migration is safe.

This is separate from the RLS function redesign.

---

# 6. P0 — Reference Data Caching

## Problem

Customer Interactions initially fetched several slowly-changing reference datasets on every page load:

- interaction types
- interaction outcomes
- employees
- customers

## Proposed Fix

Use `unstable_cache()` with appropriate revalidation/tags.

## What Worked

The latest audit reports caching already exists for:

- interaction types
- interaction outcomes
- employees
- customers

## Current Status

⚠️ PARTIALLY FIXED

Remaining caching opportunities include:
- dashboard KPIs
- some auth/context data
- potentially other admin/reference lists

Important:
User-specific enquiry and interaction lists should NOT be globally cached merely for performance.

---

# 7. P1 — Enquiries Client Data Duplication

## Problem

Earlier audit identified a pattern where the server fetched enquiries and the client could re-fetch similar data.

## Current Finding

Latest audit reports the initial Enquiries page now follows the desired pattern:

- Server Component fetches via `getEnquiriesPageData`
- data is passed to `EnquiriesClient` as props

## Current Status

✅ FIXED for the audited initial page flow.

## Note

The client-side filtering/pagination implementation should still be checked carefully to ensure it does not recreate the same query unnecessarily during interactions.

---

# 8. P1 — CustomerWorkspace Duplicate / Client Fetching

## Problem

`components/customer-workspace.tsx` uses client-side logic and calls customer-related actions through `useEffect`.

Audit concern:
- duplicated data access
- unnecessary client/server round trips

## Current Status

❌ NOT FIXED

No dedicated implementation has been attempted.

---

# 9. P1 — Dashboard as Large Client Component

## Problem

`app/(app)/dashboard/page.tsx` is a large Client Component (~544 lines).

It contains:
- hardcoded KPI data
- chart data
- alerts
- AI insight placeholders
- client-side activity log fetch

## Performance Concern

- large client-side JS
- hydration cost
- no proper server-side dashboard data aggregation
- mock data is not real backend data

## Proposed Fix

Split into:
- Server Component for data fetching
- smaller Client Components for interactive charts/widgets
- Suspense for slower sections

## Current Status

❌ NOT FIXED

---

# 10. P1 — Shipments Client-Side Data Fetching

## Problem

`app/(app)/shipments/page.tsx` is a Client Component and fetches shipment data in `useEffect`.

Search/page changes trigger browser-side Supabase queries.

## Proposed Fix

Use the Enquiries pattern:

Server Component
→ server-side data fetch
→ Client table for interaction

## Current Status

❌ NOT FIXED

---

# 11. P1 — Invoices Client-Side Data Fetching

## Problem

`app/(app)/invoices/page.tsx` follows the same client-side fetch pattern as Shipments.

## Proposed Fix

Convert page to Server Component and isolate interactive table behavior.

## Current Status

❌ NOT FIXED

---

# 12. P1 — Missing Loading / Suspense Boundaries

## Problem

Audit found no meaningful `loading.tsx` route boundaries and no relevant Suspense boundaries.

## Performance Concern

Slow server operations can block the page instead of progressively streaming UI.

## Proposed Fix

Add appropriate:
- `loading.tsx`
- `<Suspense fallback={...}>`

to major authenticated routes.

## Current Status

❌ NOT FIXED

---

# 13. P1 — Recharts Bundle Cost

## Problem

`components/charts.tsx` directly imports Recharts.

Dashboard is already a Client Component.

## Concern

Recharts may contribute significant initial client bundle weight.

## Proposed Fix

Lazy-load chart components with `dynamic()` where appropriate.

## Current Status

❌ NOT FIXED

Runtime bundle measurement is still recommended before claiming exact size/impact.

---

# 14. P1 — XLSX Export Bundle Cost

## Problem

`lib/export-utils.ts` directly imports XLSX.

Export functionality can cause a heavy dependency to enter client-side bundles.

## Proposed Fix

Load XLSX only when the user actually performs an Excel export.

## Current Status

❌ NOT FIXED

---

# 15. P1 — Command Palette Bundle Cost

## Problem

Command Palette is imported directly by the AppShell.

It is a feature that users may not need on every page load.

## Proposed Fix

Lazy-load Command Palette and load it when needed.

## Current Status

❌ NOT FIXED

---

# 16. P1 — AuthProvider at Root Layout

## Problem

`app/layout.tsx` wraps the entire application with:

`<AuthProvider>`

This includes public/authentication routes.

## Concern

- large client boundary
- auth initialization on public routes
- unnecessary client-side context for routes that do not require it

## Proposed Fix

Move AuthProvider into the authenticated `(app)` layout.

Keep middleware responsible for session handling where appropriate.

## Current Status

❌ NOT FIXED

Important:
This should be implemented carefully because RouteGuard and other components depend on AuthProvider.

---

# 17. P1 — AppShell as Large Client Boundary

## Problem

`components/app-shell.tsx` is a Client Component and wraps authenticated pages.

This contributes to a broad Client Component tree.

## Proposed Fix

Make the shell/server structure more server-oriented and push only genuinely interactive pieces to Client Components:

- Sidebar interaction
- Topbar interaction
- Command Palette
- other browser-only behavior

## Current Status

❌ NOT FIXED

---

# 18. P1 — Enquiry Detail Query Waterfall

## Problem

Earlier audit found sequential calls in:

`app/(app)/enquiries/[id]/page.tsx`

Pattern:

1. `getEnquiryDetail()`
2. `getAssignedCSName()`
3. `getEnquiryActivities()`

Independent queries were being awaited sequentially.

## Proposed Fix

Use `Promise.all()` for independent queries or combine data into an appropriate joined query.

## Current Status

❌ NOT FIXED / needs current-code confirmation before implementation.

---

# 19. Customer Interactions — Multiple Reference Queries

## Problem

Customer Interactions initially needed multiple datasets.

## Good Implementation Already Present

The page uses `Promise.all()` for initial independent data loads.

## Current Status

✅ GOOD PATTERN / PARTIALLY OPTIMIZED

Reference data caching has also been introduced for the main filter datasets.

---

# 20. Customer Interactions — Extra Admin Queries

## Problem

`listInteractions` performs additional queries to resolve:
- customer display information
- employee display information

This creates extra round trips.

## Proposed Fix

Where RLS permits, use joined queries.

Alternative:
- create an appropriate RPC returning the joined display data.

## Current Status

❌ NOT FIXED

---

# 21. Customer Search Performance

## Problem

Customer search uses multiple `ILIKE` conditions across several columns.

Potential result:
- sequential scan as data volume grows

## Proposed Fix

Consider `pg_trgm` indexes or appropriate full-text/search strategy.

## Current Status

❌ NOT IMPLEMENTED

🔍 Runtime/database measurement required first.

---

# 22. Missing Composite Indexes

## Problem

Potential missing indexes for common filtering + sorting patterns.

Examples identified:
- `enquiries(owner_id, updated_at DESC)`
- `enquiries(assigned_customer_service_id, updated_at DESC)`
- `customer_interactions(employee_id, interaction_at DESC)`

## Current Status

⚠️ PARTIAL

Some basic indexes already exist, but the complete optimization has not been implemented.

---

# 23. Activity Log Index

## Problem

Dashboard queries:

`activity_log ORDER BY created_at DESC LIMIT 8`

Audit noted no dedicated `created_at DESC` index.

## Proposed Fix

Consider:

`CREATE INDEX ON activity_log(created_at DESC);`

## Current Status

❌ NOT IMPLEMENTED

Should be validated against actual query plans/data volume first.

---

# 24. Image Optimization

## Problem

Earlier audit found:

`images: { unoptimized: true }`

in `next.config.js`.

Also a native `<img>` was found in:

`components/ui/data-display.tsx`

## Proposed Fix

- remove `unoptimized: true`
- use `next/image`
- specify dimensions
- configure Supabase Storage remote patterns if necessary

## Current Status

🔍 Needs current-code verification.

The latest baseline recommended removing `images.unoptimized`, but the final current-state matrix did not include it among the explicitly counted P0/P1 items.

Do not assume fixed or unfixed without checking the current config.

---

# 25. date-fns Bundle Optimization

## Problem

Earlier audit identified potentially broad date-fns imports.

## Proposed Fix

Use modular imports where useful and verify tree-shaking.

## Current Status

🔍 Not yet validated through bundle analysis.

---

# 26. Global Client Component Count

## Problem

Earlier audit found approximately 92 `"use client"` files.

## Interpretation

Not every Client Component is a problem.

Expected/justified Client Components include:
- Radix/shadcn interactive primitives
- authentication context
- browser event handlers
- interactive tables/forms

The real problem is unnecessarily large Client Component boundaries.

## Current Status

❌ Architectural optimization still pending.

---

# 27. What We Have Deliberately NOT Changed

The following are considered intentional and should not be removed merely for performance:

- Server Actions for mutations
- Supabase browser client where browser/realtime behavior is genuinely required
- Radix/shadcn Client Components
- RouteGuard / PermissionGate behavior
- existing RBAC semantics
- RLS security model
- Customer Master as Single Source of Truth
- business workflow logic
- Recharts as a business visualization dependency
- XLSX where Excel export is genuinely required

Optimization must preserve these behaviors.

---

# 28. Build / Typecheck Issue Discovered During P0-A

During P0-A verification:

`npm run lint` → PASS

`npm run build` → FAIL

`npm run typecheck` → FAIL

Reported issue:

`app/(app)/enquiries/page.tsx:50`

Cause reported by Nemotron:
`initialPage` prop mismatch.

This was reported as pre-existing and unrelated to P0-A.

## Current Status

❌ OPEN BUILD BLOCKER

## Next Action

Fix only the `initialPage` mismatch.

Do not combine this fix with the middleware/RLS/performance changes.

---

# 29. P0-A — Final Verified Change

This is the most recent completed performance implementation.

### Before

In-memory Map-based auth context cache.

### After

React `cache()` request-scoped memoization.

### Files Changed

- `lib/auth/server-auth.ts`

### Result

- minimal change
- no caller changes
- no RBAC changes
- no RLS changes
- no DB migration
- no new dependency
- lint passes
- server-auth compiles
- build remains blocked by unrelated Enquiries prop error

### Status

✅ COMPLETE

---

# 30. Current Priority Queue

## First

1. Fix the pre-existing `initialPage` build/typecheck error.
2. Get a clean lint/typecheck/build baseline.

## Then

3. P0-B — Middleware authentication overhead.
4. P0-C — Measure RLS performance with representative `EXPLAIN ANALYZE`.
5. P0-D — Validate/add `permissions(name)` index.
6. Finish reference-data caching where justified.

## Then P1

7. Dashboard Server Component split.
8. Shipments Server Component split.
9. Invoices Server Component split.
10. CustomerWorkspace data-fetching architecture.
11. Loading/Suspense boundaries.
12. Lazy-load Recharts.
13. Lazy-load XLSX.
14. Lazy-load Command Palette.
15. Revisit AuthProvider boundary.
16. Revisit AppShell client boundary.
17. Fix Enquiry detail waterfall.
18. Optimize Customer Interactions extra queries.

---

# 31. Golden Rule for Future Changes

For every optimization:

1. Audit current implementation.
2. State the exact problem.
3. Make one controlled change.
4. Run lint/typecheck/build.
5. Verify security/RBAC behavior.
6. Measure runtime impact where applicable.
7. Record the result here.
8. Only then move to the next optimization.

Never batch unrelated performance changes.

---

# 32. Current Overall State

### Completed

- Auth context request-scoped deduplication using React `cache()`
- Enquiries initial server-fetch pattern
- Reference-data caching for interaction types/outcomes/employees/customers
- Promise.all pattern for Customer Interactions initial reference-data loading

### Partially Completed

- Reference-data caching
- Database indexing
- overall Server/Client architecture improvements

### Outstanding

- Middleware optimization
- RLS optimization
- permissions index validation/implementation
- Dashboard server architecture
- Shipments server architecture
- Invoices server architecture
- CustomerWorkspace
- loading/Suspense
- bundle splitting
- AuthProvider boundary
- AppShell boundary
- Enquiry detail waterfall
- Customer Interaction extra queries
- search/database indexing
- runtime performance verification

---

# Change Log

## 2026-09-12 — P0-A

Problem:
Repeated auth context resolution.

Attempt:
In-memory Map cache was already present but was not reliable request-scoped caching.

Fix:
Replaced Map with React `cache()`.

Verification:
Lint PASS. Server-auth compiles. Build/typecheck blocked by separate Enquiries `initialPage` prop mismatch.

Result:
✅ Successful.

## 2026-09-12 — Performance Baseline

Performed a read-only full-project performance audit.

Result:
Several P0/P1 bottlenecks remain. No broad optimization changes were made during the baseline audit.

Next:
Fix build blocker, then proceed with P0-B middleware audit/implementation.
