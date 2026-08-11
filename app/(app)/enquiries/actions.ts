'use server';

import { listEnquiries, type ListEnquiriesFilters, type ListEnquiriesResponse, type EnquiryWorkflowRecord } from '@/lib/actions/enquiries';

export interface EnquiriesPageData {
  enquiries: EnquiryWorkflowRecord[];
  total: number;
  limit: number;
  offset: number;
  source: 'own' | 'assigned' | 'team' | 'all';
}

export async function getEnquiriesPageData(
  filters: ListEnquiriesFilters = {}
): Promise<EnquiriesPageData> {
  const result: ListEnquiriesResponse = await listEnquiries(filters);
  
  if (!result.success) {
    return {
      enquiries: [],
      total: 0,
      limit: filters.limit ?? 10,
      offset: filters.offset ?? 0,
      source: 'own',
    };
  }

  return {
    enquiries: result.enquiries,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    source: result.source,
  };
}