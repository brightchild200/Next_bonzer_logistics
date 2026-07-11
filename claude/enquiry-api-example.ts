// app/api/enquiry/route.ts
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiResponse } from '@/lib/api/error-handler';

/**
 * GET /api/enquiry
 * List enquiries for logged-in user with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return apiResponse(401, null, 'Unauthorized');
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Fetch enquiries
    const { data, error, count } = await supabase
      .from('enquiries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Enquiry fetch error:', error);
      return apiResponse(500, null, 'Failed to fetch enquiries');
    }

    return apiResponse(200, {
      enquiries: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return apiResponse(500, null, 'Unexpected error');
  }
}

/**
 * POST /api/enquiry
 * Create new enquiry
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return apiResponse(401, null, 'Unauthorized');
    }

    // Parse request body
    const body = await request.json();
    const { customer_id, items, pickup_location, delivery_location, notes } =
      body;

    // Validation
    if (!customer_id || !items || !pickup_location || !delivery_location) {
      return apiResponse(400, null, 'Missing required fields');
    }

    // Generate enquiry number (could be more sophisticated)
    const enquiryNumber = `ENQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Insert into DB
    const { data, error } = await supabase.from('enquiries').insert({
      user_id: user.id,
      customer_id,
      enquiry_number: enquiryNumber,
      items,
      pickup_location,
      delivery_location,
      notes,
      status: 'draft',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Enquiry creation error:', error);
      return apiResponse(500, null, 'Failed to create enquiry');
    }

    return apiResponse(201, { enquiry: data }, null);
  } catch (err) {
    console.error('Unexpected error:', err);
    return apiResponse(500, null, 'Unexpected error');
  }
}
