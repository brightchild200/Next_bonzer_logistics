# Bonzer Logistics - Next.js Backend Structure

```
app/
├── api/
│   ├── auth/
│   │   ├── login/route.ts          ❌ NOT NEEDED (Supabase handles)
│   │   ├── logout/route.ts         ✅ POST /api/auth/logout
│   │   └── callback/route.ts       ✅ Handle OAuth redirect
│   │
│   ├── enquiry/
│   │   ├── route.ts                ✅ GET (list) / POST (create)
│   │   ├── [id]/route.ts           ✅ GET / PATCH / DELETE
│   │   └── [id]/track/route.ts     ✅ GET (tracking data)
│   │
│   ├── visits/
│   │   ├── route.ts                ✅ GET (list) / POST (create)
│   │   ├── [id]/route.ts           ✅ GET / PATCH / DELETE
│   │   ├── [id]/location/route.ts  ✅ POST (GPS update)
│   │   └── [id]/photos/route.ts    ✅ POST (upload visit photos)
│   │
│   ├── customers/
│   │   ├── route.ts                ✅ GET (search/list) / POST
│   │   ├── [id]/route.ts           ✅ GET / PATCH / DELETE
│   │   └── [id]/history/route.ts   ✅ GET (order history)
│   │
│   ├── users/
│   │   ├── route.ts                ✅ GET (profile) / PATCH
│   │   └── [id]/route.ts           ✅ Admin endpoints
│   │
│   ├── admin/
│   │   ├── users/route.ts          ✅ Manage users
│   │   ├── analytics/route.ts      ✅ Dashboard stats
│   │   └── reports/route.ts        ✅ Export data
│   │
│   └── health/route.ts             ✅ Health check
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   │
│   ├── api/
│   │   ├── auth-check.ts           ✅ Verify user session
│   │   ├── error-handler.ts        ✅ Standardized responses
│   │   ├── validate-input.ts       ✅ Request validation
│   │   └── rate-limit.ts           ✅ Rate limiting (optional)
│   │
│   └── db/
│       ├── enquiry-service.ts      ✅ DB queries
│       ├── visits-service.ts       ✅ DB queries
│       ├── customers-service.ts    ✅ DB queries
│       └── analytics-service.ts    ✅ Stats queries
│
└── types/
    ├── api.ts                      ✅ API response types
    ├── models.ts                   ✅ Database models
    └── errors.ts                   ✅ Error types
```

## Key Architecture Decisions

### 1. **Authentication is Supabase-only**
- Don't duplicate auth in API routes
- Verify token in middleware
- Use `createClient()` from server.ts

### 2. **Database queries via service layer**
```typescript
// ✅ Good: Centralized queries
// lib/db/enquiry-service.ts
export async function getEnquiry(enquiryId: string, userId: string) {
  const supabase = createClient();
  return supabase
    .from('enquiries')
    .select('*')
    .eq('id', enquiryId)
    .eq('user_id', userId)
    .single();
}

// ❌ Avoid: Scattered queries across routes
```

### 3. **Error handling middleware**
```typescript
// lib/api/error-handler.ts
export function apiResponse<T>(
  status: number,
  data: T | null = null,
  error: string | null = null
) {
  return Response.json(
    {
      status,
      data,
      error,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// Usage in route
export async function GET(request: NextRequest) {
  try {
    const data = await getEnquiry(id);
    return apiResponse(200, data);
  } catch (err) {
    return apiResponse(500, null, 'Failed to fetch enquiry');
  }
}
```

### 4. **RLS (Row Level Security) replaces manual checks**
Supabase RLS means your queries naturally filter by user:

```sql
-- In Supabase, on enquiries table:
CREATE POLICY "users_can_see_own_enquiries" ON enquiries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_create_enquiries" ON enquiries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

Your API just queries, RLS enforces access:
```typescript
// This automatically only returns user's enquiries
const { data } = await supabase.from('enquiries').select('*');
```

### 5. **File uploads (visit photos)**
```typescript
// app/api/visits/[id]/photos/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('photo') as File;
  
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('visit-photos')
    .upload(`visit-${id}/${file.name}`, file);
    
  return apiResponse(200, data);
}
```

## Deployment Checklist

- [ ] All env vars set in Vercel/hosting provider
- [ ] RLS policies enabled on all tables
- [ ] CORS configured (not needed with same-origin)
- [ ] Rate limiting configured
- [ ] Error logging set up (Sentry, Datadog, etc.)
- [ ] Database backups automated
- [ ] API monitoring active
