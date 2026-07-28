# Plan for 009_customer_interactions_rpc.sql Changes

## Information Gathered

### customers table (from 005_customer_master.sql):
- Columns: `id`, `customer_ref`, `company_name`, `contact_person`, `email`, `phone`, `address`, `city`, `state`, `country`, `pincode`, `gst_number`, `pan_number`, `kyc_status`, `is_active`, `created_by`, `created_at`, `updated_at`

### search_customers() review:
- Already uses `CROSS JOIN LATERAL` with `NULLIF(TRIM(search_text), '') AS norm` - normalization is already optimal.
- Columns used: `customer_ref`, `company_name`, `contact_person`, `phone`, `email`, `gst_number`, `pan_number` - all match the actual schema.
- The RETURN TABLE uses `c.phone AS mobile` which maps correctly.
- **No changes needed** for search_customers.

### Missing OWNER TO postgres:
- `can_create_enquiry()` has `SECURITY DEFINER` but is missing `ALTER FUNCTION ... OWNER TO postgres;`
- Needs to be added.

### can_create_enquiry() rewrite:
- Currently `LANGUAGE SQL` - needs to be rewritten to `LANGUAGE plpgsql`
- Logic must stay identical: returns TRUE if interaction exists AND is_active = TRUE AND enquiry_id IS NULL

## Plan

### Step 1: Add ALTER FUNCTION ... OWNER TO postgres for can_create_enquiry()
After the function definition and COMMENT, add:
```sql
ALTER FUNCTION public.can_create_enquiry(UUID) OWNER TO postgres;
```

### Step 2: Rewrite can_create_enquiry() in PL/pgSQL
Convert from:
```sql
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.customer_interactions ci
        WHERE ci.id = interaction_uuid
          AND ci.is_active = TRUE
          AND ci.enquiry_id IS NULL
    );
$$;
```

To equivalent PL/pgSQL:
```sql
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.customer_interactions ci
        WHERE ci.id = interaction_uuid
          AND ci.is_active = TRUE
          AND ci.enquiry_id IS NULL
    ) INTO result;
    RETURN result;
END;
$$;
```

## Files to Edit
- `supabase/migrations/009_customer_interactions_rpc.sql` (only file)

## No Changes Needed
- search_customers() - normalization already optimal, columns already match schema
- All other functions remain unchanged
- No grants, comments, business logic, signatures, or structure changes

## Status: ✅ COMPLETE

### Change 1: Rewrote can_create_enquiry() from LANGUAGE SQL to LANGUAGE plpgsql
- Kept exact same logic: SELECT EXISTS (...) INTO result; RETURN result;
- Preserved STABLE, SECURITY DEFINER, SET SEARCH_PATH = ''
- Business logic unchanged

### Change 2: Added ALTER FUNCTION ... OWNER TO postgres
- Added: `ALTER FUNCTION public.can_create_enquiry(UUID) OWNER TO postgres;`
- Placed after COMMENT ON FUNCTION and before REVOKE
- Consistent with all other SECURITY DEFINER functions in the file

### Verified: search_customers() already optimal
- Already uses CROSS JOIN LATERAL with NULLIF(TRIM(search_text), '') AS norm
- All column references (phone, gst_number, pan_number) match customers table schema
- No changes needed

