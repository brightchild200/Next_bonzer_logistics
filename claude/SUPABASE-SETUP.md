# Supabase Setup Guide for Bonzer Logistics (Next.js)

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up
2. Create new project:
   - Name: `bonzer-logistics`
   - Database password: Generate strong password
   - Region: Choose closest to your users (Mumbai = Asia Southeast)
   - Edition: Free tier is fine for MVP

3. Wait for provisioning (~2 min)

---

## Step 2: Get Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Publishable Key (anon)**: `eyJ...` (starts with eyJ)
   
3. Also note **Service Role Key** (keep private, for server only)

---

## Step 3: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr lucide-react
```

---

## Step 4: Set Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## Step 5: Create Database Tables

Go to **SQL Editor** in Supabase and run this:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'operator', -- operator, manager, admin
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  pincode TEXT,
  gst_number TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enquiries table
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  enquiry_number TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL, -- [{name, quantity, weight, dimensions}]
  pickup_location JSONB NOT NULL, -- {address, lat, lng}
  delivery_location JSONB NOT NULL, -- {address, lat, lng}
  status TEXT DEFAULT 'draft', -- draft, confirmed, in_transit, delivered, cancelled
  estimated_cost DECIMAL,
  actual_cost DECIMAL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Visits table (daily visits/stops)
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enquiry_id UUID REFERENCES enquiries(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  visit_time TIMESTAMP,
  location JSONB NOT NULL, -- {address, lat, lng}
  status TEXT DEFAULT 'pending', -- pending, completed, skipped, rescheduled
  notes TEXT,
  photos JSONB, -- [{url, timestamp}]
  signature_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  check_in_location JSONB, -- {lat, lng}
  check_out_location JSONB,
  status TEXT DEFAULT 'present', -- present, absent, leave
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics/Stats
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  enquiries_created INT DEFAULT 0,
  visits_completed INT DEFAULT 0,
  total_distance_km DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_enquiries_user_id ON enquiries(user_id);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_enquiries_created_at ON enquiries(created_at DESC);
CREATE INDEX idx_visits_user_id ON visits(user_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_attendance_user_id_date ON attendance(user_id, date);
```

---

## Step 6: Enable Row Level Security (RLS)

RLS = automatic permission checking. Enable for all tables.

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Users can see only their own data
CREATE POLICY "users_see_own_data" ON customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_customers" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_customers" ON customers
  FOR UPDATE USING (auth.uid() = user_id);

-- Similar policies for enquiries, visits, etc.
CREATE POLICY "users_see_own_enquiries" ON enquiries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_enquiries" ON enquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_enquiries" ON enquiries
  FOR UPDATE USING (auth.uid() = user_id);

-- Visits
CREATE POLICY "users_see_own_visits" ON visits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_visits" ON visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_visits" ON visits
  FOR UPDATE USING (auth.uid() = user_id);

-- Attendance
CREATE POLICY "users_see_own_attendance" ON attendance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_attendance" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Stats
CREATE POLICY "users_see_own_stats" ON daily_stats
  FOR SELECT USING (auth.uid() = user_id);
```

---

## Step 7: Set Up Storage (for Photos)

1. Go to **Storage** section in Supabase
2. Create bucket: `visit-photos`
   - Make it **Private** (not public)
   - Add this RLS policy:

```sql
-- Storage bucket RLS for visit-photos
CREATE POLICY "users_can_upload_own_photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'visit-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_can_read_own_photos" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'visit-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Step 8: Set Up Authentication

### Email/Password Auth (Default)

1. Go to **Authentication** → **Providers**
2. Email provider should be enabled by default
3. Configure email templates (optional)
   - Go to **Auth** → **Email Templates**
   - Customize confirmation, password reset emails

### OAuth (Optional for Later)

If you want Google/GitHub login later:
1. Go to **Authentication** → **Providers**
2. Enable Google/GitHub
3. Add OAuth credentials from Google Cloud Console / GitHub

---

## Step 9: Install in Next.js Project

We already created:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`
- `middleware.ts` (at root)

Your structure is ready! ✅

---

## Step 10: Test Authentication Flow

Create a quick test page:

```typescript
// app/test/page.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function TestPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSignup() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    console.log('Signup:', { data, error });
  }

  return (
    <div className="p-8">
      <h1>Test Auth</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="border p-2 mr-2"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="border p-2 mr-2"
      />
      <button onClick={handleSignup} className="bg-blue-500 text-white px-4 py-2">
        Sign Up
      </button>
    </div>
  );
}
```

---

## Quick Reference: API Patterns

### Get Current User (Server Component)
```typescript
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### Query Data (Server Component)
```typescript
const { data } = await supabase
  .from('enquiries')
  .select('*')
  .order('created_at', { ascending: false });
```

### Realtime Subscriptions (Client Component)
```typescript
'use client';
useEffect(() => {
  const channel = supabase
    .channel('enquiries-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'enquiries' },
      (payload) => {
        console.log('Change received!', payload);
      }
    )
    .subscribe();
  
  return () => channel.unsubscribe();
}, []);
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "undefined process.env.NEXT_PUBLIC_SUPABASE_URL" | Make sure `.env.local` has the correct keys |
| "user not authenticated" in API | Check middleware.ts is configured |
| RLS blocks queries | Make sure you're logged in, check policies |
| 400 on signup | Email might already exist, try different email |

---

## Next Steps

1. ✅ Tables created
2. ✅ RLS enabled
3. ✅ Auth configured
4. Create `/register` page similar to login
5. Create Dashboard page (protected route)
6. Build API endpoints (using example patterns above)
7. Add realtime updates if needed
