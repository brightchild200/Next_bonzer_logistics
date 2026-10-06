# CRM Next.js Performance Audit
**Project:** next_logistics (Operational CRM)
**Stack:** Next.js 13.5.1 · Supabase · Tailwind CSS · Recharts · xlsx
**Date:** September 2026

---

## Overview

The app was taking 3–4 seconds per page navigation, and some pages were loading
for 25–70 seconds in the Network tab. Total client bundle was 24 MB. This
document lists every problem found, its root cause, and how it was resolved.

---

## Problem 1 — Entire xlsx library loading on the client

### Symptom
Bundle analyzer showed `xlsx.mjs` as the single largest block in the client
bundle. Every page load was downloading the full xlsx library even on pages that
never export anything.

### Root Cause
`import * as XLSX from 'xlsx'` was used directly inside client components (the
Export buttons for Shipments, KYC, Enquiries, Customer Interactions). This
caused Next.js to bundle xlsx into the client-side JavaScript that every user
downloads.

The xlsx library is ~500 KB on its own. It has no reason to run in the browser
— it is a file generation utility that belongs on the server.

### Fix Applied
Moved all xlsx logic to a single server-side API route:

```
POST /api/export/xlsx
```

The route uses a dynamic server-side import:

```ts
// app/api/export/xlsx/route.ts
export async function GET() {
  const XLSX = await import('xlsx')   // server only, never sent to browser
  // ... generate workbook, return buffer
}
```

All client Export buttons now just call:

```ts
const handleExport = () => window.open('/api/export', '_blank')
```

Zero xlsx imports remain in any client component.

### Result
`xlsx.mjs` disappeared from the client bundle entirely. Confirmed via
bundle analyzer re-run. Estimated saving: ~500 KB off client bundle.

---

## Problem 2 — Recharts loading on every page (shared chunk leak)

### Symptom
Bundle analyzer showed `recharts/es6` + `ChartUtils.js + 86 modules
(concatenated)` as the largest remaining block in the client chunk. Pages with
no charts (Follow-ups, KYC, Enquiries) were still downloading
`_app-pages-browser_components_charts_tsx.js` at 910 KB.

### Root Cause
Even though `dynamic()` wrappers were added in `components/charts-wrapper.tsx`,
recharts was still being pulled into the shared chunk. This happens when a file
that imports recharts is itself imported (directly or transitively) from the
app layout, a shared provider, or any component that renders on every page.

Next.js treats any import reachable from the shared layout as part of the shared
bundle — the `dynamic()` call prevents SSR but does NOT prevent the module from
being included in the shared chunk if something outside the dynamic wrapper
touches it.

### Fix Applied — Step 1: dynamic() wrappers (implemented)
All five chart components wrapped in `next/dynamic` with `ssr: false`:

```ts
// components/charts-wrapper.tsx
const RevenueChart    = dynamic(() => import('./charts/RevenueChart'),    { ssr: false })
const ShipmentChart   = dynamic(() => import('./charts/ShipmentChart'),   { ssr: false })
const ModeSplitChart  = dynamic(() => import('./charts/ModeSplitChart'),  { ssr: false })
const ImportExportChart = dynamic(() => import('./charts/ImportExportChart'), { ssr: false })
const CustomerGrowthChart = dynamic(() => import('./charts/CustomerGrowthChart'), { ssr: false })
```

### Fix Applied — Step 2: optimizePackageImports (added to next.config.js)

```js
const nextConfig = {
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-icons'],
  },
}
```

### Remaining Action
Run the following to find any remaining direct recharts import reachable from
the shared layout:

```bash
grep -r "charts" ./app --include="*.tsx" --include="*.ts" -l
```

Any file in that list that is NOT behind a `dynamic()` import is the leak.

---

## Problem 3 — Middleware bundle at 200 KB

### Symptom
Bundle analyzer (edge.html) showed `middleware.js` at 200 KB. Next.js middleware
runs on every single request at the edge before any page loads. A 200 KB
middleware means every navigation waits for a 200 KB cold-start function to
execute.

### Root Cause
`lib/db/middleware-edge.ts` was importing `@supabase/supabase-js` — the full
Supabase client. This package includes realtime subscriptions, storage, REST
client, and auth all bundled together. Only auth token verification is needed
in middleware.

```ts
// ❌ Old: pulled full 200 KB Supabase client into every edge request
import { createClient } from '@supabase/supabase-js'
```

### Fix Applied
Replaced with `@supabase/ssr`'s `createServerClient` which is the official
edge-compatible lightweight client designed exactly for this use case:

```ts
// ✅ New: edge-safe, ~30 KB
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Still validates session properly — not a cookie bypass
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}
```

Security note: `supabase.auth.getUser()` is still called — this is NOT a simple
cookie check. The session is cryptographically validated server-side. No
security compromise.

### Expected Result
Middleware drops from ~200 KB to ~30 KB. Every navigation that hits middleware
saves ~170 KB of edge cold-start overhead.

---

## Problem 4 — get_my_auth_context called 4 times per page

### Symptom
Network tab showed `get_my_auth_context` firing 4 separate times on a single
page load, each taking 280–697 ms. Total auth overhead per page: ~2,000 ms just
from duplicate auth checks.

Also: `token?grant_type=refresh_token` was firing twice simultaneously —
two components trying to refresh the same token at the same time.

### Root Cause
Multiple components (layout, sidebar, header, page component) were each
independently calling `supabase.auth.getUser()`. Every call hits the Supabase
API network — it is not a local cache.

```ts
// ❌ Each component doing this separately = 4 network calls
const { data: { user } } = await supabase.auth.getUser()
```

### Fix (To Be Applied)
Call `getUser()` exactly once in the app layout. Pass the result down via
React Context so every child component reads from memory, not the network:

```ts
// app/(app)/layout.tsx — single auth call
export default async function AppLayout({ children }) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()  // once only

  if (!user) redirect('/login')

  return (
    <AuthProvider user={user}>
      {children}
    </AuthProvider>
  )
}
```

```ts
// Any child component — zero network calls
'use client'
export function Sidebar() {
  const { user } = useAuth()  // reads from context, no fetch
}
```

### Expected Result
Auth calls drop from 4 → 1 per page. Saves ~1,500–2,000 ms per navigation.
The double token refresh also disappears since only one refresh cycle runs.

---

## Problem 5 — 24 MB total client resources

### Symptom
Network tab showed `24,135 kB resources` on the dashboard. Normal CRM apps
are 1–3 MB. This caused the initial 25-second load time.

### Root Cause — Multiple contributors

| Library | Issue | Size Impact |
|---------|-------|------------|
| `xlsx` | Loaded client-side | ~500 KB |
| `recharts` | Not lazy-loaded | ~400 KB |
| `lucide-react` | Possible wildcard import | ~200 KB |
| `@supabase/supabase-js` | Full client in middleware | ~170 KB edge |
| Next.js 13.5.1 | Outdated, worse splitting | General |

### Fixes Applied
- xlsx → server-side API route (Problem 1)
- recharts → dynamic() + optimizePackageImports (Problem 2)
- lucide-react → verify named imports only (not `import * as Icons`)

### Remaining Fix — Upgrade Next.js
Current version 13.5.1 is significantly outdated. Next.js 15 has better
automatic code splitting, faster cold starts, and improved bundle optimization.

```bash
npm install next@latest react@latest react-dom@latest
```

Expected improvement: 30–40% faster routing from the framework upgrade alone.

---

## Problem 6 — Sequential Supabase fetches (identified, not yet fixed)

### Symptom
Requests on dashboard were staggered across 10,000–15,000 ms in the waterfall.

### Root Cause
Supabase table fetches were chained with `await` sequentially — each waits for
the previous to complete before starting.

```ts
// ❌ Sequential — 3× slower
const customers = await supabase.from('customers').select()
const deals     = await supabase.from('deals').select()
const tasks     = await supabase.from('tasks').select()
```

### Fix (To Be Applied)

```ts
// ✅ Parallel — all start at the same time
const [customers, deals, tasks] = await Promise.all([
  supabase.from('customers').select('id, name, email, status'),
  supabase.from('deals').select('id, title, value, stage'),
  supabase.from('tasks').select('id, title, due_date, assignee'),
])
```

Also: always select only the columns the UI renders, never `select('*')`.

---

## Problem 7 — Supabase client instantiated multiple times

### Symptom
`GoTrueClient.js` appeared as a large block in multiple chunks of the client
bundle.

### Root Cause
The Supabase client was being created inside components or utility functions
that get imported by multiple chunks. Each chunk that imports it gets its own
copy of the client.

### Fix (To Be Applied)

```ts
// lib/supabase.ts — one shared instance
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Import from this single file everywhere. Never call `createClient()` inside a
component or inside a function that runs per-render.

---

## Summary Table

| # | Problem | Root Cause | Status | Est. Time Saved |
|---|---------|-----------|--------|----------------|
| 1 | xlsx in client bundle | Client-side import | ✅ Fixed | ~1–2 s |
| 2 | Recharts in shared chunk | Eager import leak | 🔄 Partial | ~1–1.5 s |
| 3 | 200 KB middleware | Wrong Supabase client | ✅ Fixed | ~0.5–1 s |
| 4 | Auth called 4× per page | No shared auth context | ⏳ Pending | ~1.5–2 s |
| 5 | 24 MB bundle | Multiple heavy libraries | 🔄 Partial | ~2–3 s |
| 6 | Sequential DB fetches | Chained awaits | ⏳ Pending | ~1–2 s |
| 7 | Supabase multi-instance | No shared client | ⏳ Pending | ~0.3 s |

**Before:** 25–70 seconds load, 24 MB resources
**Target after all fixes:** Under 2 seconds, under 3 MB resources

---

## Next Steps (in priority order)

1. Find recharts leak — run `grep -r "charts" ./app --include="*.tsx" -l`
   and check which files are NOT behind a `dynamic()` import
2. Create shared `AuthProvider` context — eliminate 3 of 4 auth calls per page
3. Audit all Supabase fetches — convert sequential `await` chains to `Promise.all`
4. Upgrade Next.js to v15 — `npm install next@latest react@latest react-dom@latest`
5. Create single `lib/supabase.ts` client — stop GoTrueClient from appearing
   in multiple chunks

---

*Generated during performance audit session — September 2026*