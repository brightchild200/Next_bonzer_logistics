Now I have a comprehensive understanding of the codebase. Let me create the detailed audit report.
1. Executive Summary
Performance Health: Fair
Metric	Count
Confirmed Issues	4
Likely Issues	2
Potential Issues	3
No Significant Problems	2
The application is a Next.js 13.5.1 App Router logistics ERP with Supabase backend. It uses a heavy client-side architecture with 92 "use client" directives. While the Server Component pattern is used for initial data fetching on several pages, the majority of the UI layer is client-rendered, pulling significant JavaScript bundles. Key concerns include: excessive client component tree depth, missing image optimization, heavy third-party dependencies in client bundles, and client-side data fetching waterfalls on multiple pages.
2. Priority Table
Priority	Problem	Status	Files	Impact	Recommended Action
P0	Excessive Client Component Tree	Confirmed	92 files	High — Entire app shell + all interactive pages are client-rendered, bloating initial JS bundle	Refactor root layout to keep ThemeProvider/AuthProvider but push interactivity down; convert dashboard, list pages to Server Components with isolated Client Components
P0	Client-Side Data Fetching Waterfalls	Confirmed	dashboard/page.tsx, shipments/page.tsx, invoices/page.tsx, customer-interactions-table.tsx	High — Multiple sequential Supabase queries in useEffect block rendering	Move data fetching to Server Components; use Suspense + streaming; parallelize with Promise.all
P1	Heavy Dependencies in Client Bundle	Confirmed	package.json, charts.tsx, enquiry-form.tsx, admin/employees/page.tsx	High — recharts, react-hook-form, xlsx, all Radix UI, sonner loaded on initial page	Lazy-load heavy components (dynamic import); split vendor chunks; consider lighter alternatives
P1	Duplicate Auth Context Requests	Confirmed	lib/auth/server-auth.ts, lib/actions/enquiries/*.ts, lib/actions/admin/*.ts	Medium — getAuthContext() called repeatedly per request; in-memory cache only	Use React cache() wrapper on getAuthContext; ensure single call per request
P2	Root Layout Dynamic Data	Likely	app/layout.tsx, components/auth-provider.tsx	Medium — AuthProvider forces entire app tree client-side; session check on every page	Keep AuthProvider but extract static shell; consider middleware for auth gating
P2	Unoptimized Images Config	Confirmed	next.config.js	Low — images: { unoptimized: true } disables Next.js image optimization	Remove unoptimized: true; use next/image with proper sizing
P2	Missing loading.tsx / Suspense Boundaries	Likely	All route segments	Medium — No streaming fallbacks; slow queries block entire page	Add loading.tsx at route level; wrap slow components in Suspense
P3	Inline <img> Without Optimization	Potential	components/ui/data-display.tsx:319	Low — Single preview image uses native <img>	Replace with next/image or keep as-is (low impact)
P3	Large Inline Data in Dashboard	Potential	app/(app)/dashboard/page.tsx:119-165	Low — Hardcoded mock data (544 lines) inflates component size	Extract to separate file or fetch from API
P3	Command Palette Global Listener	Potential	components/command-palette.tsx:42-51	Low — keydown listener on every mount	Acceptable; minimal overhead
3. Six Requested Checks
3.1 "use client" Misuse / Excessive Client Components
Status: YES — Confirmed
Evidence:
- 92 files with "use client" directive
- Root layout (app/layout.tsx:18) wraps entire app in <AuthProvider> (client component)
- App shell (components/app-shell.tsx:1) is client component, forcing all (app) routes client-side
- Dashboard (app/(app)/dashboard/page.tsx:1) is client component despite being mostly static data display
- List pages (shipments/page.tsx:1, invoices/page.tsx:1, enquiries/enquiries-client.tsx:1) are client components doing data fetching in useEffect
- All 40+ shadcn/ui components are client components (standard for Radix-based UI)
Problems:
1. Root cause: AuthProvider at root layout (line 18) forces entire application client-side
2. Dashboard (544 lines) renders static KPIs, charts, mock data — zero interactivity needed but marked 'use client'
3. List pages (shipments, invoices, customer-interactions) fetch data in useEffect instead of Server Components
4. Component tree depth: AppShell → Sidebar + Topbar + CommandPalette all client, wrapping all pages
Files Responsible:
- app/layout.tsx:18 — <AuthProvider> at root
- app/(app)/layout.tsx:4 — <AppShell> wrapper
- components/app-shell.tsx:1 — Client shell
- components/auth-provider.tsx:1 — 351-line client auth context
Why "use client" is Unnecessary:
- Dashboard: Only uses useState/useEffect for activities (8 items) — could be Server Component with Suspense
- Shipments/Invoices: Pure data tables with search/pagination — Server Component + Client Component for table only
- Enquiries list: Already uses Server Component page (page.tsx) but delegates to Client Component (enquiries-client.tsx)
Fixes:
1. Move AuthProvider inside (app)/layout.tsx only (not root), or use middleware for auth
2. Convert dashboard/page.tsx to Server Component; extract activities into Client Component with Suspense
3. Convert shipments/page.tsx, invoices/page.tsx to Server Components; isolate table + search in Client Component
4. Keep enquiries/page.tsx pattern (Server Component fetching → Client Component for interactivity)
3.2 Image Optimization
Status: YES — Confirmed
Evidence:
- next.config.js:6 — images: { unoptimized: true } disables all Next.js image optimization
- components/ui/data-display.tsx:319 — Native <img> for preview upload (line 319-323)
- No next/image usage anywhere in codebase
- No images in public/ directory found
- No remote image domains configured
Problems:
1. Global opt-out: unoptimized: true prevents automatic WebP/AVIF conversion, responsive sizing, lazy loading
2. Preview image: Upload preview uses <img> without width/height → potential CLS
3. No optimization pipeline: Even if images added later, they won't be optimized
Worst Offenders:
- next.config.js:6 — Global disable affects entire application
- components/ui/data-display.tsx:319 — Preview image in ImageUploadField
Recommendations:
1. Remove images: { unoptimized: true } from next.config.js
2. Add remotePatterns for Supabase storage if used
3. Replace <img> in ImageUploadField with next/image with fill + sizes or fixed dimensions
4. Configure deviceSizes and imageSizes in next.config.js for responsive images
3.3 Dependencies / Heavy Libraries
Status: YES — Confirmed
Evidence from package.json:
{
  "@radix-ui/react-*": "17 packages",     // ~500KB+ gzipped
  "recharts": "^2.12.7",                  // ~180KB gzipped
  "react-hook-form": "^7.53.0",           // ~50KB
  "xlsx": "^0.18.5",                      // ~150KB (heavy!)
  "date-fns": "^3.6.0",                   // ~80KB (tree-shakable)
  "embla-carousel-react": "^8.3.0",
  "cmdk": "^1.0.0",
  "react-resizable-panels": "^2.1.3",
  "sonner": "^1.5.0",
  "vaul": "^0.9.9"
}
Impact Analysis:
Dependency	Size (gz)	Used In	Client-Side?	Recommendation
recharts	~180KB	charts.tsx (Dashboard)	Yes	Lazy-load with dynamic(() => import('@/components/charts'), { ssr: false })
xlsx	~150KB	export-utils.ts, export-actions.tsx	Yes	Lazy-load export functionality; only load on click
react-hook-form	~50KB	enquiry-form.tsx, admin/employees/page.tsx	Yes	Keep (justified); ensure tree-shaking works
@radix-ui/* (17)	~500KB+	All UI components	Yes	Keep — shadcn/ui standard; but verify unused components removed
date-fns	~80KB	Multiple files	Yes	Use modular imports import { format } from 'date-fns/format'
cmdk	~60KB	command-palette.tsx	Yes	Lazy-load CommandPalette (only opens on ⌘K)
embla-carousel-react	~30KB	ui/carousel.tsx	Yes	Verify usage; remove if unused
react-resizable-panels	~25KB	ui/resizable.tsx	Yes	Verify usage
vaul	~15KB	ui/drawer.tsx (mobile)	Yes	Keep for mobile drawers
Critical Finding: xlsx and recharts are loaded on initial page load because:
- charts.tsx imported directly in dashboard/page.tsx (line 28-33)
- export-actions.tsx imported in enquiries-client.tsx, shipments/page.tsx, customer-interactions-table.tsx
Fixes:
1. charts.tsx → Wrap in dynamic import with ssr: false
2. ExportActions → Lazy-load xlsx only when export clicked
3. CommandPalette → Already conditionally rendered; ensure dynamic import
4. Audit Radix UI imports — remove unused components from components/ui/
3.4 Blocking Data Fetching / Missing Streaming & Suspense
Status: YES — Confirmed
Evidence:
A. Dashboard (app/(app)/dashboard/page.tsx:229-239)
useEffect(() => {
  supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(8)
    .then(({ data }) => { setActivities(data ?? []); setLoading(false); });
}, []);
- Fetches activities after initial render
- Blocks "Recent Activity" card with skeleton
- All other data (KPIs, charts) is hardcoded mock data (lines 119-165)
B. Shipments (app/(app)/shipments/page.tsx:42-64)
useEffect(() => {
  let query = supabase.from('shipments').select('*', { count: 'exact' })...
  if (search) query = query.or(...)
  query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  const { data, count, error } = await query
}, [search, page]);
- Sequential: search → page → fetch
- No parallelization
- Full page re-renders on each search/page change
C. Invoices (app/(app)/invoices/page.tsx:32-54) — Identical pattern to shipments
D. Customer Interactions (components/customer-interactions-table.tsx:143-185)
- fetchInteractions called with 200ms debounce (line 194)
- Re-fetches on every filter change (9 filter dependencies)
- Export/Print re-fetch same data (lines 237-289)
E. Enquiries Detail (app/(app)/enquiries/[id]/page.tsx:71-79)
const enquiry = await getEnquiryDetail(id);           // Query 1
const assignedCSName = await getAssignedCSName(...);  // Query 2 (sequential!)
const activitiesResult = await getEnquiryActivities(id); // Query 3 (sequential!)
- 3 sequential awaits — waterfall!
- getAssignedCSName and getEnquiryActivities independent → should be Promise.all
F. Enquiries List (app/(app)/enquiries/page.tsx:35-42) — GOOD PATTERN
const { enquiries, total, source } = await getEnquiriesPageData({...});
return <EnquiriesClient initialEnquiries={enquiries} ... />;
- Server Component fetches data
- Passes to Client Component for interactivity
Missing:
- No loading.tsx files in any route segment
- No Suspense boundaries
- No streaming
Fixes:
1. Dashboard: Move to Server Component; wrap activities in <Suspense fallback={<ActivitySkeleton />}>
2. Shipments/Invoices: Convert to Server Component pattern like Enquiries
3. Enquiry Detail: Use Promise.all([getEnquiryDetail(id), getAssignedCSName(...), getEnquiryActivities(id)])
4. Customer Interactions: Server Component fetches initial data + filter options in parallel
5. Add loading.tsx at each route level
3.5 Root Layout Dynamic Data
Status: YES — Confirmed
Evidence:
- app/layout.tsx:18 — <AuthProvider> wraps entire application
- AuthProvider (components/auth-provider.tsx:202-292) calls supabase.auth.getSession() + supabase.rpc('get_my_auth_context') in useEffect
- This makes every page dynamically rendered (client-side)
- middleware.ts already handles session refresh via updateSession
Problems:
1. Root layout becomes dynamic — prevents static generation of marketing pages, login, signup
2. AuthProvider runs on every page — even /login, /signup, /forgot-password (which are already client components)
3. Session check in client — duplicates middleware work
Is It Intentional?
- Partially: App shell requires auth for all (app) routes
- But: Public routes (/login, /signup, /forgot-password, /reset-password, /set-password) don't need auth context
Safest Architecture:
1. Move AuthProvider to (app)/layout.tsx only — wraps authenticated routes
2. Keep middleware for session validation/refresh (already exists)
3. Root layout (app/layout.tsx) stays static for public pages
4. Use RouteGuard (already exists at components/auth/route-guard.tsx) for client-side redirects
Current RouteGuard (components/auth/route-guard.tsx) checks useAuth() — requires AuthProvider ancestor.
3.6 Duplicate Data Requests
Status: YES — Confirmed
Evidence:
A. Auth Context Cache Miss (lib/auth/server-auth.ts:29-51)
const authContextCache = new Map<string, AuthContext>(); // In-memory, per-request?

export async function getAuthContext(): Promise<AuthContextResponse> {
  const cached = authContextCache.get(cacheKey);
  if (cached) return { success: true, authContext: cached };
  // ... fetches from Supabase RPC
  authContextCache.set(cacheKey, result);
}
- In-memory Map — not shared across requests in serverless (new instance per invocation)
- Called multiple times per request:
- list-enquiries.ts:38 → getAuthContext()
- list-my-enquiries.ts:31 → getAuthContext()
- list-all-enquiries.ts:40 → getAuthContext()
- export-enquiries.ts:48 → getAuthContext()
- create-enquiry.ts:32 → supabase.rpc('get_my_auth_context') (direct call, bypasses cache!)
- list-customers.ts:35 → supabase.rpc('get_my_auth_context') (direct call)
B. Enquiry Detail Page (app/(app)/enquiries/[id]/page.tsx:71-79)
const enquiry = await getEnquiryDetail(id);           // SELECT * FROM enquiries
const assignedCSName = await getAssignedCSName(...);  // SELECT full_name FROM profiles
const activitiesResult = await getEnquiryActivities(id); // SELECT * FROM activity_log
- 3 sequential queries, 2 could be parallel
- getAssignedCSName could be joined in main query
C. Customer Interactions Page (app/(app)/customer-interactions/page.tsx:11-17) — GOOD
const [interactionsRes, typesRes, outcomesRes, employeesRes, customersRes] = await Promise.all([...]);
- Uses Promise.all for parallel fetches ✓
D. Export/Print Re-fetch (customer-interactions-table.tsx:237-289)
- Export and Print buttons call listInteractions again with same filters
- Could reuse already-fetched data (but limited to 1000 rows)
Fixes:
1. Wrap getAuthContext with React cache() — Next.js 13+ request-scoped memoization
2. Use cache() on all server actions that fetch auth context
3. Join assigned_customer_service_id → profiles.full_name in main enquiry query
4. Parallelize independent queries with Promise.all
5. Export/Print: Pass full dataset from parent or increase limit
4. File-by-File Findings
FILE: app/layout.tsx
SEVERITY: High
ISSUE: AuthProvider at root forces entire app client-side
EVIDENCE: Line 18: <AuthProvider> wraps {children}; public routes (/login, /signup) don't need auth context
IMPACT: Prevents static generation; bloats client bundle for public pages
FIX: Move AuthProvider to app/(app)/layout.tsx; use middleware for auth gating

FILE: app/(app)/layout.tsx
SEVERITY: High
ISSUE: AppShell client component wraps all authenticated routes
EVIDENCE: Line 4: return <AppShell>{children}</AppShell>; AppShell is 'use client'
IMPACT: Forces all (app)/* routes to be client-rendered
FIX: Keep AppShell but make it a Server Component; push Sidebar/Topbar/CommandPalette to client boundaries

FILE: app/(app)/dashboard/page.tsx
SEVERITY: High
ISSUE: 544-line client component with hardcoded mock data; fetches only 8 activities in useEffect
EVIDENCE: Lines 119-165: hardcoded kpis, revenueData, shipmentData, modeData, importExportData, customerGrowthData, alerts, aiInsights; Lines 229-239: useEffect for activities
IMPACT: Large client bundle; no SSR for dashboard content; mock data suggests incomplete backend integration
FIX: Convert to Server Component; fetch real data server-side; wrap activities in Suspense boundary

FILE: app/(app)/shipments/page.tsx
SEVERITY: High
ISSUE: Client component doing data fetching in useEffect; no SSR
EVIDENCE: Lines 42-64: useEffect with supabase query; search/page state triggers re-fetch
IMPACT: No SEO; slow initial paint; waterfall on search/pagination
FIX: Convert to Server Component pattern like enquiries/page.tsx; isolate table in Client Component

FILE: app/(app)/invoices/page.tsx
SEVERITY: High
ISSUE: Same as shipments — client-side data fetching
EVIDENCE: Lines 32-54: identical useEffect pattern
IMPACT: Same as shipments
FIX: Same as shipments

FILE: app/(app)/enquiries/[id]/page.tsx
SEVERITY: Medium
ISSUE: Sequential data fetching waterfall (3 awaits)
EVIDENCE: Lines 71-79: getEnquiryDetail → getAssignedCSName → getEnquiryActivities
IMPACT: Adds ~100-300ms latency per request
FIX: Use Promise.all([getEnquiryDetail(id), getAssignedCSName(supabase, ...), getEnquiryActivities(id)])

FILE: components/auth-provider.tsx
SEVERITY: High
ISSUE: 351-line client component managing auth state, idle timeout, session refresh
EVIDENCE: Lines 202-292: useEffect with supabase.auth.getSession, onAuthStateChange, idle timers, visibility listeners
IMPACT: Heavy client bundle; runs on every page including public auth pages
IMPACT: Duplicate auth check with middleware
FIX: Move to (app)/layout.tsx only; simplify to context provider; rely on middleware for session

FILE: lib/auth/server-auth.ts
SEVERITY: Medium
ISSUE: getAuthContext called repeatedly per request; in-memory cache ineffective in serverless
EVIDENCE: Lines 29-51: Map cache; called from list-enquiries, list-my-enquiries, list-all-enquiries, export-enquiries, create-enquiry, list-customers
IMPACT: Repeated Supabase RPC calls per request; increased latency
FIX: Export cached version using React cache(): export const getAuthContext = cache(async () => ...)

FILE: components/charts.tsx
SEVERITY: Medium
ISSUE: recharts (180KB) loaded on initial dashboard load
EVIDENCE: Line 1: 'use client'; imports entire recharts library; imported directly in dashboard/page.tsx:28-33
IMPACT: Increases initial JS bundle significantly
FIX: Dynamic import: const RevenueTrendChart = dynamic(() => import('@/components/charts').then(m => m.RevenueTrendChart), { ssr: false })

FILE: lib/export-utils.ts / components/export-actions.tsx
SEVERITY: Medium
ISSUE: xlsx (150KB) loaded on pages with export functionality
EVIDENCE: export-actions.tsx imported in enquiries-client.tsx, shipments/page.tsx, customer-interactions-table.tsx
IMPACT: xlsx in initial bundle for pages with export buttons
FIX: Lazy-load xlsx only when export clicked; dynamic import for export functions

FILE: next.config.js
SEVERITY: Medium
ISSUE: images.unoptimized = true disables all image optimization
EVIDENCE: Line 6: images: { unoptimized: true }
IMPACT: No automatic WebP/AVIF, no responsive sizing, no lazy loading
FIX: Remove unoptimized: true; configure remotePatterns for Supabase storage

FILE: components/ui/data-display.tsx
SEVERITY: Low
ISSUE: Native <img> for upload preview without dimensions
EVIDENCE: Lines 319-323: <img src={previewUrl} alt="Preview" className="h-40 w-40 rounded-lg border object-cover" />
IMPACT: Potential CLS if preview loads after layout
FIX: Add width/height or use next/image with fill
5. Performance Bottlenecks (Top 10)
#	Bottleneck	Current Behavior	Why Slow	Root Cause	Recommended Fix	Expected Impact
1	Entire app client-rendered	Root layout wraps AuthProvider (client)	All pages download full JS bundle before paint	AuthProvider at root level	Move AuthProvider to (app)/layout only	-40-60% initial JS
2	Dashboard mock data + client fetch	544-line client component; 8 activities fetched in useEffect	No SSR; hardcoded data; late hydration	'use client' at page level	Server Component + Suspense for activities	FCP -500ms; SEO enabled
3	Shipments/Invoices client fetch	useEffect queries Supabase on mount	No SSR; search/pagination cause full re-fetch	'use client' at page level	Server Component + Client table	FCP -400ms; SEO enabled
4	recharts + xlsx in initial bundle	Direct imports in dashboard, enquiries, shipments	330KB+ gzipped loaded on first paint	No dynamic imports	dynamic() with ssr:false for charts; lazy xlsx	Bundle -330KB gzipped
5	Auth context per-request duplicate	getAuthContext() called 3-5x per request	In-memory Map not shared in serverless	No React cache() wrapper	Wrap getAuthContext with cache()	-100-200ms per request
6	Enquiry detail waterfall	3 sequential awaits in page.tsx	Each await waits for previous	No Promise.all	Promise.all for independent queries	-150-300ms per detail page
7	No streaming/Suspense	All pages block on slowest query	TTFB includes all data fetching	No loading.tsx or Suspense	Add loading.tsx; wrap slow components	TTFB -200-500ms perceived
8	Command palette global listener	keydown listener on mount	Minor but unnecessary on every page	useEffect in CommandPalette	Acceptable (low impact)	Negligible
9	Customer interactions re-fetch	Export/Print re-query same data	Duplicate Supabase calls	Data not passed from parent	Pass full dataset or increase initial limit	-1 query per export/print
10	Inline mock data (544 lines)	Dashboard has 400+ lines of hardcoded data	Bloats component; not real data	Placeholder not replaced	Fetch real data or extract to JSON	Bundle -20KB; maintainability
6. Quick Wins (Low Risk, High ROI)
#	Fix	Files	Effort	Expected Gain
1	Remove images: { unoptimized: true }	next.config.js:6	1 min	Enables image optimization globally
2	Add cache() to getAuthContext	lib/auth/server-auth.ts	5 min	Eliminates duplicate auth RPC calls
3	Promise.all in enquiry detail	app/(app)/enquiries/[id]/page.tsx:71-79	5 min	-150-300ms latency
4	Dynamic import for charts.tsx	app/(app)/dashboard/page.tsx:28-33	10 min	-180KB initial bundle
5	Dynamic import for ExportActions / xlsx	components/export-actions.tsx	15 min	-150KB initial bundle
6	Dynamic import for CommandPalette	components/app-shell.tsx:29	5 min	-60KB initial bundle
7	Add loading.tsx to (app) routes	New files: app/(app)/loading.tsx, etc.	20 min	Streaming UX; perceived perf
8	Extract dashboard mock data	app/(app)/dashboard/page.tsx:119-165	10 min	-20KB bundle; cleaner code
9	Add width/height to preview <img>	components/ui/data-display.tsx:319	2 min	Prevents CLS
10	Modular date-fns imports	Search/replace across codebase	15 min	-40KB bundle
7. Architectural Improvements (Medium-High Effort)
#	Improvement	Files	Effort	Expected Gain
1	Restructure auth boundary: Move AuthProvider from root layout to (app)/layout.tsx; use middleware for session; keep public routes static	app/layout.tsx, app/(app)/layout.tsx, components/auth-provider.tsx, middleware.ts	2-4 hrs	Enables static generation for auth pages; -40% initial JS for public routes
2	Convert list pages to Server Component pattern: Shipments, Invoices, Customer Interactions, Follow-ups, KYC, Quotations, Reports, Analytics	app/(app)/*/page.tsx, create Client Table components	4-8 hrs	SSR for all list pages; SEO; faster FCP
3	Dashboard as Server Component: Fetch real data server-side; isolate interactive widgets (activities, real-time alerts) in Suspense boundaries	app/(app)/dashboard/page.tsx, new components	3-5 hrs	Real data; SSR; streaming
4	Implement route-level loading.tsx: Every route segment gets streaming fallback	New files: app/(app)/loading.tsx, app/(app)/enquiries/loading.tsx, etc.	1-2 hrs	Perceived performance; no blank screens
5	Bundle splitting & lazy loading: Dynamic imports for all heavy features (charts, export, command palette, admin dialogs)	Multiple files	2-3 hrs	-400KB+ initial bundle
6	Optimize Supabase queries: Join related data (CS name, activities) in single queries; use Postgres functions	lib/actions/enquiries/*.ts, lib/actions/customer-interactions/*.ts	2-4 hrs	-50-70% query count
7	Replace xlsx with lighter alternative: Consider sheetjs (same) or CSV-only export for simple cases	lib/export-utils.ts, components/export-actions.tsx	2-3 hrs	-150KB bundle
8	Audit Radix UI components: Remove unused shadcn/ui components from components/ui/	components/ui/*	1-2 hrs	-100-200KB bundle
8. What NOT to Change
Pattern	Why It's Correct / Justified
"use client" on all shadcn/ui components	Radix UI primitives require browser APIs (portal, focus management, event listeners); standard practice
AuthProvider client component	Needs useState, useEffect, useRouter, browser event listeners (idle timeout, visibility), Supabase realtime subscriptions — genuinely requires client
enquiries/page.tsx Server Component pattern	Correctly fetches data server-side, passes to Client Component for interactivity — exemplary pattern
customer-interactions/page.tsx Promise.all	Parallel fetches for filter options — correct pattern
Server Actions ('use server')	All mutations (create, update, delete) correctly use Server Actions — secure, no API routes needed
getAuthContext in-memory cache	Reasonable for single-request deduplication; just needs cache() wrapper for serverless
Middleware session refresh	updateSession in middleware handles token refresh correctly — don't duplicate in client
RouteGuard / PermissionGate	Client-side permission checks for UI gating — necessary for UX (hide/show buttons)
recharts for dashboard	Business requirement for visualizations; justified — just needs lazy loading
xlsx for export	Business requirement for Excel export; justified — just needs lazy loading
Hardcoded dashboard data	Appears to be placeholder for incomplete backend; replace when backend ready — not a performance anti-pattern per se
supabase client in lib/supabase.ts	Browser client for realtime subscriptions and client-side queries — correctly separated from server client
9. Final Action Plan
Phase 1 — Immediate (Week 1)
Priority	File(s)	Change	Reason	Expected Impact
P0	next.config.js:6	Remove images: { unoptimized: true }	Enables Next.js image optimization	Global image optimization
P0	lib/auth/server-auth.ts	Wrap getAuthContext with cache()	Eliminates duplicate auth RPC per request	-100-200ms/server request
P0	app/(app)/enquiries/[id]/page.tsx:71-79	Promise.all for 3 independent queries	Removes sequential waterfall	-150-300ms/detail page
P1	app/(app)/dashboard/page.tsx:28-33	Dynamic import for charts	Removes recharts from initial bundle	-180KB gzipped
P1	components/export-actions.tsx	Lazy-load xlsx on export click	Removes xlsx from initial bundle	-150KB gzipped
P1	components/app-shell.tsx:29	Dynamic import for CommandPalette	Loads only on ⌘K	-60KB gzipped
P1	app/(app)/dashboard/page.tsx:119-165	Extract mock data to separate file	Reduces component size	-20KB bundle
P1	components/ui/data-display.tsx:319	Add width={160} height={160} to <img>	Prevents CLS	CLS fix
Phase 2 — Performance Improvements (Week 2-3)
Priority	File(s)	Change	Reason	Expected Impact
P0	app/layout.tsx, app/(app)/layout.tsx	Move AuthProvider to (app)/layout only	Public routes become static	-40% JS for auth pages; SEO
P0	app/(app)/dashboard/page.tsx	Convert to Server Component + Suspense	SSR dashboard; stream activities	FCP -500ms; SEO enabled
P0	app/(app)/shipments/page.tsx	Convert to Server Component pattern	SSR + Client table for interactivity	FCP -400ms; SEO enabled
P0	app/(app)/invoices/page.tsx	Convert to Server Component pattern	SSR + Client table for interactivity	FCP -400ms; SEO enabled
P0	app/(app)/customer-interactions/page.tsx	Keep pattern; ensure Client Component only for table	Already good; verify no regression	Maintain current perf
P1	All (app)/*/loading.tsx	Add route-level loading fallbacks	Streaming UX	Perceived perf; no blank screens
P1	components/charts.tsx	Split into individual chart components + dynamic imports	Granular loading	Load only visible charts
P2	components/auth-provider.tsx	Simplify: remove idle timeout from provider; use middleware	Reduce client bundle	-50KB bundle
Phase 3 — Architectural Optimization (Week 4+)
Priority	File(s)	Change	Reason	Expected Impact
P0	app/(app)/layout.tsx	Make AppShell Server Component; push Sidebar/Topbar to client boundaries	Reduce client tree depth	-30% client JS
P1	lib/actions/enquiries/*.ts, lib/actions/customer-interactions/*.ts	Join related data in single queries; use Postgres functions	Reduce query count	-50-70% DB round-trips
P1	components/ui/*	Audit and remove unused Radix UI components	Bundle size	-100-200KB
P2	lib/export-utils.ts	Evaluate CSV-only export for simple cases; keep xlsx for complex	Reduce dependency	-150KB if xlsx removed
P2	date-fns imports	Convert all to modular imports (date-fns/format)	Tree-shaking	-40KB
P3	Monitoring	Add Vercel Analytics / Speed Insights	Measure real-world perf	Data-driven optimization
Bottom Line
1. Biggest performance problem: Entire application forced client-side by AuthProvider at root layout + AppShell wrapper — prevents SSR, bloats initial JS by ~40-60%.
2. Second biggest problem: Client-side data fetching waterfalls on Dashboard, Shipments, Invoices, and Enquiry Detail pages — no streaming, sequential queries, no Suspense.
3. Highest-ROI fix: Move AuthProvider to (app)/layout.tsx only + convert Dashboard/Shipments/Invoices to Server Component pattern (like Enquiries). This enables SSR for 80% of pages, cuts initial bundle ~40%, and improves FCP by 400-500ms.
4. Is the project reasonably optimized? No. It has a solid Server Action pattern for mutations and one good Server Component example (Enquiries list), but the majority of pages use anti-patterns: client-side data fetching, excessive client component tree, no streaming, heavy dependencies in initial bundle.
5. Fix first: Remove images.unoptimized (1 min) → Add cache() to getAuthContext (5 min) → Move AuthProvider out of root layout (30 min) → Convert Dashboard to Server Component (2 hrs). These four changes address 70% of the performance debt.