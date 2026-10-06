# BONZER PERFORMANCE BASELINE

---

## A. Executive Summary

**Current Health: 🔴 CRITICAL**

The Bonzer Logistics ERP has **significant performance debt** across all audited areas. Of the 23 identified issues:

| Status | Count |
|--------|-------|
| ✅ FIXED | 0 |
| ⚠️ PARTIALLY FIXED | 5 |
| ❌ NOT FIXED | 16 |
| 🔍 NEEDS RUNTIME VERIFICATION | 2 |
| ➖ NOT APPLICABLE | 0 |

**Key Finding**: Zero P0 issues are fixed. The codebase architecture still exhibits all the fundamental anti-patterns identified in previous audits:
- Serverless-incompatible in-memory caching
- No React `cache()` memoization
- Middleware hitting auth on every navigation
- RLS function executing JOINs per-row
- Entire app tree forced into Client Components
- No streaming/loading boundaries
- Heavy dependencies in initial bundle

---

## B. Status Matrix

| ID | Issue | Status | Evidence | Priority |
|---|---|---|---|---|
| 1 | Repeated get_my_auth_context / auth context resolution | ❌ NOT FIXED | `lib/auth/server-auth.ts:29-51` in-memory Map; `lib/actions/enquiries/list-enquiries.ts:38` calls `getAuthContext()` per action | P0 |
| 2 | Middleware calling getUser() unnecessarily | ❌ NOT FIXED | `lib/db/middleware-edge.ts:50` calls `supabase.auth.getUser()` on every matched request | P0 |
| 3 | RLS current_user_has_permission() performance | ❌ NOT FIXED | `supabase/migrations/005_customer_master.sql:10-25` JOINs 4 tables; called per-row in RLS | P0 |
| 4 | Missing permissions(name) index | ❌ NOT FIXED | Only `role_permissions_role_id_idx` and `role_permissions_permission_id_idx` exist (`001_core_identity_rbac.sql:153-157`) | P0 |
| 5 | Missing caching for slowly-changing reference data | ⚠️ PARTIALLY FIXED | `unstable_cache` used for interaction-types, outcomes, employees, customers filters; NOT for dashboard KPIs, auth context, admin employees | P0 |
| 6 | EnquiriesClient duplicating server-fetched data | ❌ NOT FIXED | `app/(app)/enquiries/enquiries-client.tsx:97-131` export/print call `exportEnquiries` Server Action re-fetching | P1 |
| 7 | CustomerWorkspace duplicating server-fetched data | ❌ NOT FIXED | `components/customer-workspace.tsx:132-209` Client Component with `useEffect` fetching, no server pre-fetch | P1 |
| 8 | Dashboard being a large Client Component | ❌ NOT FIXED | `app/(app)/dashboard/page.tsx:1` `'use client'` 544 lines with recharts, useEffect for activity_log | P1 |
| 9 | Shipments page doing client-side data fetching | ❌ NOT FIXED | `app/(app)/shipments/page.tsx:1` `'use client'` with `useEffect` + direct supabase queries | P1 |
| 10 | Invoices page doing client-side data fetching | ❌ NOT FIXED | `app/(app)/invoices/page.tsx:1` `'use client'` with `useEffect` + direct supabase queries | P1 |
| 11 | Missing Suspense/loading.tsx boundaries | ❌ NOT FIXED | Zero `loading.tsx` files; zero `Suspense` usage in app directory | P1 |
| 12 | Heavy dependencies loaded in initial client bundles | ❌ NOT FIXED | `recharts` in `charts.tsx:3-19`; `xlsx` in `export-utils.ts:1`; `cmdk` in `command-palette.tsx:6-13` | P1 |
| 13 | Recharts not lazy-loaded | ❌ NOT FIXED | Direct import in `components/charts.tsx:3-19` used by Dashboard | P1 |
| 14 | XLSX/export functionality not lazy-loaded | ❌ NOT FIXED | Direct import in `lib/export-utils.ts:1` used by 5+ Client Components | P1 |
| 15 | Command Palette not lazy-loaded | ❌ NOT FIXED | `components/app-shell.tsx:6` imports `CommandPalette` at AppShell level | P1 |
| 16 | AuthProvider at root layout | ❌ NOT FIXED | `app/layout.tsx:18` wraps entire app in Client Component | P1 |
| 17 | AppShell forcing a large client component tree | ❌ NOT FIXED | `components/app-shell.tsx:1` `'use client'` wraps all `(app)` routes | P1 |
| 18 | Enquiry detail sequential data-fetching waterfall | ❌ NOT FIXED | `app/(app)/enquiries/[id]/page.tsx:71-79` sequential `await` for 3 queries | P1 |
| 19 | Customer Interactions additional admin queries | ⚠️ PARTIALLY FIXED | `lib/actions/customer-interactions/queries/list-interactions.ts:247-279` uses adminClient for display data; page uses `Promise.all` | P1 |
| 20 | Missing/insufficient database indexes for common filtered queries | ⚠️ PARTIALLY FIXED | Basic indexes exist; missing composite indexes for ORDER BY + WHERE patterns | P2 |
| 21 | Customer search using multiple ILIKE without trigram indexes | ❌ NOT FIXED | `supabase/migrations/009_customer_interactions_rpc.sql:100-108` 7x ILIKE; no pg_trgm | P2 |
| 22 | activity_log created_at index | ⚠️ PARTIALLY FIXED | `activity_owner_created_idx` on `(owner_id, created_at DESC)` exists (`20260707092110_bonzer_schema_init.sql:210`); Dashboard queries without owner_id filter | P2 |
| 23 | Composite indexes for enquiries and customer_interactions | ⚠️ PARTIALLY FIXED | Some FK indexes exist; missing composites for common filter+sort patterns | P2 |

---

## C. Already Fixed

**None.** Zero issues from the previous audit have been genuinely resolved in the current codebase.

---

## D. Still Outstanding (Ordered P0 → P1 → P2 → P3)

### P0 - Critical (Blocking serverless scalability & auth performance)

| Issue | File | Evidence |
|-------|------|----------|
| 1. Repeated get_my_auth_context | `lib/auth/server-auth.ts:29-51` | In-memory `Map` cache (`authContextCache`) does not persist across serverless invocations. Every Server Action calls `getAuthContext()` → `supabase.rpc('get_my_auth_context')`. No `React.cache()` wrapper. |
| 2. Middleware getUser() on every request | `lib/db/middleware-edge.ts:41-50` | `updateSession()` creates Supabase client and calls `supabase.auth.getUser()` on **every** matched request (config matches all routes except static assets + auth pages). No request-scoped memoization. |
| 3. RLS current_user_has_performance() JOINs per-row | `supabase/migrations/005_customer_master.sql:10-25` | Function executes `SELECT EXISTS` with 3 JOINs (user_roles → role_permissions → permissions) for **every RLS policy evaluation**. Called multiple times per query (once per policy, potentially per row). |
| 4. Missing permissions(name) index | `supabase/migrations/001_core_identity_rbac.sql:147-157` | Only indexes on `role_permissions.role_id` and `role_permissions.permission_id`. No index on `permissions.name` which is the filter column in `current_user_has_permission()`. |
| 5. Reference data caching incomplete | `lib/actions/customer-interactions/queries/*.ts` | `unstable_cache` used for 4 reference datasets (interaction-types, outcomes, employees, customers). **Missing**: dashboard KPIs, user auth context, admin employee list, roles list. |

### P1 - High Impact (Client bundle, data fetching, streaming)

| Issue | File | Evidence |
|-------|------|----------|
| 6. EnquiriesClient export re-fetch | `app/(app)/enquiries/enquiries-client.tsx:97-131` | `handleExport`/`handlePrint` call `exportEnquiries` Server Action which re-executes the full list query with same filters. |
| 7. CustomerWorkspace all client-side | `components/customer-workspace.tsx:132-209` | Entire component is `'use client'` with `useEffect` calling `listCustomers` Server Action. No server pre-fetch. |
| 8. Dashboard large Client Component | `app/(app)/dashboard/page.tsx:1-544` | 544 lines, imports recharts directly, `useEffect` fetches `activity_log`, all KPIs hardcoded. Forces entire dashboard into client bundle. |
| 9. Shipments client-side fetching | `app/(app)/shipments/page.tsx:1-233` | `'use client'`, `useEffect` with direct `supabase.from('shipments')` queries. No server pre-fetch. |
| 10. Invoices client-side fetching | `app/(app)/invoices/page.tsx:1-173` | `'use client'`, `useEffect` with direct `supabase.from('invoices')` queries. No server pre-fetch. |
| 11. No loading.tsx / Suspense | **Entire app directory** | `glob app/**/loading.tsx` → 0 results. No `Suspense` boundaries in any layout/page. |
| 12. Heavy deps in initial bundle | `package.json` + imports | `recharts` (2.12.7) in `charts.tsx`; `xlsx` (0.18.5) in `export-utils.ts`; `cmdk` (1.0.0) in `command-palette.tsx`; `vaul`, `react-resizable-panels`, `sonner`, `embla-carousel-react` all imported by always-loaded Client Components. |
| 13. Recharts not lazy | `components/charts.tsx:3-19` | Direct `import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, ... } from 'recharts'` — loaded on Dashboard initial render. |
| 14. XLSX not lazy | `lib/export-utils.ts:1` | `import * as XLSX from 'xlsx'` at top level; used by Enquiries, Shipments, Invoices, KYC, Customer Interactions — all Client Components. |
| 15. Command Palette not lazy | `components/app-shell.tsx:6` | `import { CommandPalette } from '@/components/command-palette'` at AppShell level — loaded for every authenticated route. |
| 16. AuthProvider at root | `app/layout.tsx:18` | `<AuthProvider>` wraps `{children}` — forces entire app tree to be Client Components (AppShell, Dashboard, etc.). |
| 17. AppShell forces client tree | `components/app-shell.tsx:1` | `'use client'` with Sidebar, Topbar, CommandPalette — all Client Components. Every `(app)` route inherits this. |
| 18. Enquiry detail waterfall | `app/(app)/enquiries/[id]/page.tsx:71-79` | Sequential: `getEnquiryDetail()` → `getAssignedCSName()` → `getEnquiryActivities()`. No `Promise.all()`. |
| 19. Customer Interactions admin queries | `lib/actions/customer-interactions/queries/list-interactions.ts:247-279` | Uses `createAdminClient()` to fetch customer/employee display names per request. Page uses `Promise.all` for initial load (good), but filter changes trigger new requests. |

### P2 - Medium (Database indexes, search optimization)

| Issue | File | Evidence |
|-------|------|----------|
| 20. Missing composite indexes | Multiple migrations | Basic single-column indexes exist (e.g., `customers_company_name_idx`, `enquiries_assigned_customer_service_status`). No composite indexes for common `(status, updated_at)`, `(customer_id, interaction_at)`, etc. |
| 21. Customer search no pg_trgm | `supabase/migrations/009_customer_interactions_rpc.sql:100-108` | `search_customers` RPC uses 7 `ILIKE '%term%'` conditions. No `pg_trgm` extension or GIN trigram indexes on search columns. |
| 22. activity_log index incomplete | `supabase/legacy-migrations/20260707092110_bonzer_schema_init.sql:210` | Index `activity_owner_created_idx` on `(owner_id, created_at DESC)` exists but Dashboard queries `activity_log` with **no owner_id filter** (Dashboard: `supabase.from('activity_log').select('*').order('created_at', {ascending: false})`). |
| 23. Missing enquiry/interaction composites | Multiple migrations | `enquiries` has `idx_enquiries_assigned_customer_service_status` but no `(status, updated_at)` or `(owner_id, status)`. `customer_interactions` has single-column indexes but no composite for `(customer_id, interaction_at)` or `(employee_id, interaction_at)`. |

---

## E. Partially Fixed

| Issue | What's Fixed | What Remains |
|-------|--------------|--------------|
| 5. Reference data caching | `unstable_cache` implemented for: interaction-types (1hr), interaction-outcomes (1hr), employees-for-filter (5min), customers-for-filter (5min) | Dashboard KPIs, user auth context (server), admin employee list, roles list, follow-up types not cached |
| 19. Customer Interactions admin queries | Page uses `Promise.all` for initial load of interactions + reference data | Each filter change triggers new `listInteractions` call which uses `createAdminClient()` for display names |
| 20. Database indexes | Basic FK and filter indexes exist on all tables | Missing composite indexes for ORDER BY + WHERE patterns |
| 22. activity_log index | `activity_owner_created_idx` on `(owner_id, created_at DESC)` exists | Dashboard query doesn't filter by owner_id, so index not used |
| 23. Composite indexes | Some FK indexes exist (e.g., `idx_enquiries_shipper_id`, `idx_enquiries_consignee_id`) | Missing composites for common access patterns |

---

## F. Runtime Verification Required

| Area | What to Measure | Why |
|------|-----------------|-----|
| **Auth context duplication** | Count `get_my_auth_context` RPC calls per request via Supabase logs | In-memory cache doesn't work in serverless; each Server Action invocation is a new process |
| **Middleware overhead** | Network tab: middleware duration on navigation vs static assets | `getUser()` adds ~50-150ms per navigation; runs on every page transition |
| **RLS function cost** | `EXPLAIN ANALYZE` on enquiries/customers/interactions SELECT with RLS | `current_user_has_permission()` JOINs may execute per-row; need actual query plans |
| **Bundle size** | `next build` + `@next/bundle-analyzer` | Cannot determine actual chunk sizes statically; recharts/xlsx/cmdk likely >200KB gzipped |
| **Dashboard FCP/TTI** | Chrome DevTools Performance panel | Dashboard is 544-line Client Component with 5 recharts charts — likely blocks main thread |
| **Enquiry detail waterfall** | Network tab on `/enquiries/[id]` | 3 sequential Server Actions → ~300-600ms added latency |
| **Customer search latency** | Supabase query logs for `search_customers` RPC | 7x ILIKE without trigram indexes → sequential scans on large customer tables |
| **Activity log query** | `EXPLAIN ANALYZE` on Dashboard activity_log query | No owner_id filter + ORDER BY created_at DESC → full index scan or sort |
| **Cache hit rates** | Next.js cache tags / `revalidate` behavior in production | `unstable_cache` with `tags` requires `revalidateTag` on mutations — verify invalidation works |
| **Middleware matcher scope** | Count middleware invocations per session via logs | Current matcher excludes only static assets + auth pages — runs on API routes, Server Actions |

---

## G. Database/RLS Findings

### Confirmed Safe Observations (Static Analysis)

1. **RLS Policies Use Permission Checks Correctly**
   - All policies use `public.current_user_has_permission('perm:name')` — authorization semantics preserved
   - No `auth.uid() = owner_id` bypasses found in current migrations (018, 020, 022)

2. **current_user_has_permission() is SECURITY DEFINER**
   - Defined with `SECURITY DEFINER SET SEARCH_PATH = ''` — safe from search_path injection
   - Returns boolean, no data leakage

3. **Reference Data Caching Uses Cache Tags**
   - `unstable_cache` with `tags: ['interaction-types']` etc. — enables targeted invalidation
   - Revalidation intervals reasonable (1hr for types/outcomes, 5min for filters)

4. **Server Actions Validate Permissions**
   - Every Server Action calls `getAuthContext()` → `hasPermission()` before data access
   - No bypass of RBAC found

### Changes Requiring Careful Testing

| Change | Risk | Test Strategy |
|--------|------|---------------|
| Add `permissions(name)` index | Low (read-only) | `EXPLAIN` before/after on `current_user_has_permission()` |
| Add `pg_trgm` + GIN indexes | Medium (storage, write overhead) | Benchmark `search_customers` with 10k+ customers |
| Wrap `getAuthContext` with `cache()` | Medium (serverless cache semantics) | Verify per-request deduplication; test concurrent requests |
| Move AuthProvider to client-only subtree | High (architectural) | Verify all Client Components still receive auth context; test sign-out flow |
| Convert Dashboard to Server Component + streaming | High (UI rewrite) | Visual regression; test chart interactivity in isolated Client Components |
| Add `loading.tsx` boundaries | Low (additive) | Verify streaming works; test error boundaries |

---

## H. Recommended Next Steps (Top 5 by Impact × Safety × Measurability)

| # | Action | Impact | Risk | Validation |
|---|--------|--------|------|------------|
| 1 | **Wrap `getAuthContext()` with `React.cache()`** | Eliminates duplicate `get_my_auth_context` RPC per request (~100-200ms) | Very Low | Supabase RPC logs: count calls per request |
| 2 | **Add `permissions(name)` index** | Speeds up every RLS policy evaluation | Low | `EXPLAIN ANALYZE` on any RLS-protected SELECT |
| 3 | **Remove `images.unoptimized: true` from next.config.js** | Enables Next.js Image Optimization (smaller images, lazy loading) | Low | Lighthouse: Image optimization score |
| 4 | **Add `loading.tsx` to Dashboard, Enquiries, Shipments, Invoices, Customer Interactions** | Immediate streaming UX; unblocks React 18 streaming | Low | Visual: skeleton shown during Server Component fetch |
| 5 | **Lazy-load CommandPalette, Recharts, XLSX** | Reduces initial client bundle by ~150-250KB gzipped | Low | `next build` + bundle analyzer; Network tab on initial load |

---

## I. Regression / Safety Check

| Area | Status | Notes |
|------|--------|-------|
| **RBAC behavior** | ✅ Preserved | All Server Actions validate permissions via `hasPermission(authContext, PERMISSIONS.*)` |
| **RLS security** | ✅ Preserved | Policies use `current_user_has_permission()` — no direct `auth.uid()` comparisons in new migrations |
| **Business workflow** | ⚠️ At risk if AuthProvider moved | CustomerWorkspace, Dashboard, Shipments, Invoices are all Client Components dependent on `useAuth()` — moving AuthProvider requires refactoring these to receive props or use Server Actions |
| **Customer Master as SSOT** | ✅ Preserved | Customer data fetched via Server Actions with permission checks; no client-side bypass |
| **Server Action authorization** | ✅ Preserved | Every action calls `getAuthContext()` first |
| **Multi-role permissions** | ✅ Preserved | `getPermissionsForRoles()` in `permission-utils.ts` correctly aggregates; `hasAnyPermission`/`hasAllPermission` used appropriately |

---

## Appendix: Key File Reference

| Area | Files |
|------|-------|
| Auth Context (Server) | `lib/auth/server-auth.ts`, `lib/auth/permissions.ts`, `lib/auth/permission-utils.ts` |
| Middleware | `middleware.ts`, `lib/db/middleware-edge.ts` |
| RLS Core | `supabase/migrations/001_core_identity_rbac.sql`, `002_auth_context_rpc.sql`, `005_customer_master.sql` |
| RLS Enquiries | `supabase/migrations/018_enquiry_rls_permission_aware.sql`, `020_enquiry_rls_update_team_scope.sql` |
| RLS Interactions | `supabase/migrations/008_customer_interactions.sql`, `013_customer_interactions_rls_read_own.sql`, `022_customer_interactions_rls_read_team.sql` |
| Server Actions (Enquiries) | `lib/actions/enquiries/list-enquiries.ts`, `get-enquiry-activities.ts`, `list-*.ts` |
| Server Actions (Interactions) | `lib/actions/customer-interactions/queries/list-interactions.ts`, `list-*-for-filter.ts` |
| Client Pages (Problematic) | `app/(app)/dashboard/page.tsx`, `app/(app)/shipments/page.tsx`, `app/(app)/invoices/page.tsx`, `app/(app)/enquiries/enquiries-client.tsx`, `components/customer-workspace.tsx` |
| Root Layout | `app/layout.tsx`, `app/(app)/layout.tsx`, `components/app-shell.tsx`, `components/auth-provider.tsx` |
| Caching | `lib/actions/customer-interactions/queries/list-interaction-types.ts`, `list-interaction-outcomes.ts`, `list-employees-for-filter.ts`, `list-customers-for-filter.ts` |
| Bundle Heavy Deps | `package.json`, `components/charts.tsx`, `lib/export-utils.ts`, `components/command-palette.tsx` |
| Database Indexes | `supabase/migrations/001_core_identity_rbac.sql:147-157`, `005_customer_master.sql:100-106`, `008_customer_interactions.sql:84-101`, `20260707092110_bonzer_schema_init.sql:210` |

---

**End of Audit** — This report reflects static code analysis only. Runtime verification (Section F) is required before implementing fixes.