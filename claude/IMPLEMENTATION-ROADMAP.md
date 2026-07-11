# Bonzer Logistics: Next.js Migration Roadmap

## Overview
Your Bonzer Logistics project is shifting from **Expo/React Native** to **Next.js** for web-first operations. This is the right move if your primary use case is a web ops dashboard.

---

## What You Get with This Migration

| Aspect | Expo/RN | Next.js |
|--------|---------|---------|
| **Platform** | Mobile (iOS/Android) + Web | Web-only (for now) |
| **Codebase** | Separate web code | Single codebase |
| **Backend** | Separate Node.js server | Built into routes |
| **Deployment** | Mobile app stores + Vercel | Single Vercel deploy |
| **Database** | Supabase ✓ | Supabase ✓ |
| **Hosting Cost** | App stores + server | Vercel free tier |

**Trade-off:** You lose mobile for now, but gain speed to market and operational simplicity.

---

## Phase 1: Project Setup (Day 1)

### Step 1A: Create Next.js Project
```bash
npx create-next-app@latest bonzer-logistics --typescript --tailwind
cd bonzer-logistics
```

### Step 1B: Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react
```

### Step 1C: Copy Files to Your Project
```
From downloads → Your project:

# Config
.env.local.example → .env.local (fill in Supabase credentials)

# Core auth files
lib/supabase/
  ├── client.ts
  ├── server.ts
  └── middleware.ts

# Middleware at root
middleware.ts

# Auth components
components/auth/
  ├── LoginForm.tsx
  ├── AuthBackground.tsx
  ├── PasswordInput.tsx
  └── ErrorBox.tsx

# Login page
app/(auth)/login/
  └── page.tsx (copy bonzer-login-nextjs.tsx)
```

---

## Phase 2: Supabase Setup (Day 1-2)

### Follow SUPABASE-SETUP.md:
1. ✅ Create Supabase project
2. ✅ Get credentials → Add to `.env.local`
3. ✅ Run SQL migrations (copy from guide)
4. ✅ Enable RLS on all tables
5. ✅ Set up storage buckets
6. ✅ Test auth flow

**Time: 30-60 min**

---

## Phase 3: Login & Auth Flow (Day 2-3)

### What's Ready:
- ✅ Login page with truck animation
- ✅ Supabase client setup
- ✅ Middleware for token refresh

### What You Need to Build:
1. **Register page** (`app/(auth)/register/page.tsx`)
   - Similar to login, but with extra fields (full_name, company_name, phone)
   - Create user in auth + users table

2. **Protected layout** (`app/(dashboard)/layout.tsx`)
   - Check if user is logged in
   - Redirect to login if not

3. **Dashboard page** (`app/(dashboard)/page.tsx`)
   - Show user info, quick stats
   - Navigation links to enquiries, visits, customers

### Example: Register Page Structure
```typescript
// app/(auth)/register/page.tsx
'use client';
// Similar to LoginForm but with:
// - full_name, company_name, phone fields
// - handleRegister() instead of handleLogin()
// - Validation: password strength, email format
// - After auth.signUp(), create user in users table

async function handleRegister() {
  // 1. auth.signUp() from Supabase
  // 2. Insert into users table with username, full_name, etc.
  // 3. Redirect to /dashboard
}
```

**Time: 4-6 hours**

---

## Phase 4: Backend API Scaffolding (Day 3-4)

### Structure (Already Planned):
```
app/api/
├── auth/logout/route.ts
├── enquiry/route.ts (GET/POST)
├── enquiry/[id]/route.ts (GET/PATCH/DELETE)
├── visits/route.ts
├── visits/[id]/route.ts
├── customers/route.ts
└── health/route.ts
```

### Build Pattern (Follow enquiry-api-example.ts):
1. Get user from auth
2. Query database via Supabase client
3. Return standardized response

### Estimated Routes to Build:
- `api/enquiry/*` (4 routes)
- `api/visits/*` (4 routes)
- `api/customers/*` (3 routes)
- `api/auth/logout` (1 route)

**Time: 8-10 hours**

---

## Phase 5: Frontend Pages (Day 4-7)

### Priority Order:

**High Priority (Week 1):**
1. ✅ Login / Register (done)
2. Enquiry List page
   - GET `/api/enquiry`
   - Display table with pagination
   - Add/Edit/Delete buttons

3. Enquiry Detail page
   - Show full enquiry
   - Edit form
   - Status updates

4. Customers List
   - Search/filter
   - Add customer modal

**Medium Priority (Week 2):**
5. Visits List
   - Calendar view or daily list
   - GPS location display
   - Photo upload

6. Attendance Page
   - Check-in/out with GPS
   - Daily stats

7. Admin Dashboard
   - User management
   - Analytics/stats

**Low Priority (Week 3):**
8. Reporting
9. Advanced analytics
10. Settings/Profile

**Time: 15-20 hours total**

---

## Phase 6: Deployment (Day 8)

### Deploy to Vercel (Easiest):

```bash
# 1. Create GitHub repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/bonzer-logistics
git push -u origin main

# 2. Go to vercel.com
# 3. Import from GitHub
# 4. Set environment variables:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
#    - SUPABASE_SERVICE_ROLE_KEY

# 5. Deploy!
```

Your app will be live at: `bonzer-logistics.vercel.app`

**Time: 15 min**

---

## File Placement Quick Reference

```
bonzer-logistics/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           ← Copy bonzer-login-nextjs.tsx here
│   │   ├── register/page.tsx        ← Build this
│   │   └── layout.tsx               ← Public layout
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx               ← Protected layout (check auth)
│   │   ├── page.tsx                 ← Dashboard home
│   │   ├── enquiry/
│   │   │   ├── page.tsx             ← Enquiry list
│   │   │   └── [id]/page.tsx        ← Enquiry detail
│   │   ├── visits/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── customers/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   │
│   ├── api/
│   │   ├── auth/logout/route.ts
│   │   ├── enquiry/route.ts
│   │   ├── enquiry/[id]/route.ts
│   │   ├── visits/route.ts
│   │   ├── visits/[id]/route.ts
│   │   └── customers/route.ts
│   │
│   ├── layout.tsx                   ← Global layout
│   └── globals.css
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx            ← Copy from downloads
│   │   ├── AuthBackground.tsx       ← Copy from downloads
│   │   ├── PasswordInput.tsx        ← Copy from downloads
│   │   └── ErrorBox.tsx             ← Copy from downloads
│   │
│   └── ui/
│       ├── Table.tsx
│       ├── Modal.tsx
│       └── Button.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                ← Copy from downloads
│   │   ├── server.ts                ← Copy from downloads
│   │   └── middleware.ts            ← Copy from downloads
│   │
│   ├── api/
│   │   └── error-handler.ts         ← Standardized responses
│   │
│   └── db/
│       ├── enquiry-service.ts       ← DB queries
│       ├── visits-service.ts
│       └── customers-service.ts
│
├── types/
│   ├── api.ts                       ← API response types
│   └── models.ts                    ← Database types
│
├── middleware.ts                    ← Copy from downloads
├── .env.local                       ← Copy .env.local.example, fill values
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Testing Checklist

### Phase 1 (Auth)
- [ ] Can create account
- [ ] Can log in with email
- [ ] Can log in with username
- [ ] Session persists on page reload
- [ ] Can log out
- [ ] Protected pages redirect to login
- [ ] Truck animation works (visible in background)

### Phase 2 (API)
- [ ] GET /api/enquiry returns user's enquiries
- [ ] POST /api/enquiry creates enquiry
- [ ] PATCH /api/enquiry/:id updates enquiry
- [ ] DELETE /api/enquiry/:id deletes enquiry
- [ ] Same for visits and customers

### Phase 3 (UI)
- [ ] Enquiry list displays data
- [ ] Add enquiry modal works
- [ ] Edit enquiry form prefills data
- [ ] Delete enquiry shows confirmation
- [ ] Pagination works
- [ ] Search/filter works

### Phase 4 (Deployment)
- [ ] Deployed to Vercel
- [ ] Env vars are set
- [ ] Auth works on production domain
- [ ] Database queries work from production
- [ ] No CORS errors

---

## Common Mistakes to Avoid

❌ **Mistake 1: Using client-side auth in API routes**
```typescript
// WRONG
export async function GET(request: NextRequest) {
  const supabase = createClient(); // ← Browser client in route handler!
}

// RIGHT
export async function GET(request: NextRequest) {
  const supabase = createClient(); // ← Server client from middleware setup
}
```

❌ **Mistake 2: Forgetting RLS policies**
```sql
-- WRONG: No RLS, anyone can query anyone's data
SELECT * FROM enquiries;

-- RIGHT: With RLS, only owner sees their data
CREATE POLICY ... WHERE auth.uid() = user_id;
```

❌ **Mistake 3: Mixing React Native and Next.js code**
- React Native: `View`, `Text`, `ScrollView`
- Next.js: `div`, `p`, `div`
- They're incompatible, don't mix!

❌ **Mistake 4: Storing sensitive data in NEXT_PUBLIC_*vars**
```bash
# WRONG
NEXT_PUBLIC_API_KEY=secret123

# RIGHT
NEXT_PUBLIC_SUPABASE_URL=url (public is OK)
SUPABASE_SERVICE_ROLE_KEY=secret (no NEXT_PUBLIC_)
```

---

## Estimated Timeline

| Phase | Duration | Days |
|-------|----------|------|
| Project Setup | 1-2 hours | Day 1 |
| Supabase Setup | 1-2 hours | Day 1-2 |
| Login/Auth | 4-6 hours | Day 2-3 |
| Backend API | 8-10 hours | Day 3-4 |
| Frontend Pages | 15-20 hours | Day 4-7 |
| Deployment | 30 mins | Day 8 |
| **TOTAL** | **~40 hours** | **~1-2 weeks** |

For a full MVP (with all core features): **2-3 weeks**

---

## Next: What to Do Right Now

1. **Create Next.js project**
   ```bash
   npx create-next-app@latest bonzer --typescript --tailwind
   ```

2. **Copy files** from downloads to project

3. **Create Supabase project** (takes 2 min)

4. **Follow SUPABASE-SETUP.md** step by step

5. **Test login page** with Supabase credentials

6. **Ask me questions!** Before building big features

---

## Have Clarifying Questions?

Before you build:
- ❓ Should visits have GPS tracking?
- ❓ Do you need photo uploads?
- ❓ Should enquiry status auto-update?
- ❓ Need customer search/autocomplete?
- ❓ Real-time updates needed?

Let me know and I'll add those to the build plan! 🚀
