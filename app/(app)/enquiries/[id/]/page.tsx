import { notFound } from 'next/navigation';
import { createClient } from '@/lib/db/server';
import { EnquiryDetailClient } from './enquiry-detail-client';
import { getEnquiryActivities, type EnquiryActivity } from '@/lib/actions/enquiries';
import type { EnquiryWorkflowRecord } from '@/lib/actions/enquiries';

interface EnquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getEnquiryDetail(id: string): Promise<EnquiryWorkflowRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('enquiries')
    .select(
      `
      id,
      owner_id,
      reference,
      customer_id,
      customer_name,
      origin,
      destination,
      mode,
      cargo_type,
      weight_kg,
      volume_cbm,
      incoterm,
      status,
      expected_shipment_date,
      notes,
      assigned_customer_service_id,
      assigned_by,
      assigned_at,
      quoted_at,
      won_at,
      lost_at,
      archived_at,
      closed_by,
      created_at,
      updated_at
      `
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as EnquiryWorkflowRecord;
}

async function getAssignedCSName(supabase: ReturnType<typeof createClient>, csId: string | null): Promise<string | null> {
  if (!csId) return null;

  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', csId)
    .single();

  return data?.full_name ?? null;
}

export default async function EnquiryDetailPage({ params }: EnquiryDetailPageProps) {
  const { id } = await params;
  const supabase = createClient();

  const enquiry = await getEnquiryDetail(id);

  if (!enquiry) {
    notFound();
  }

  const assignedCSName = await getAssignedCSName(supabase, enquiry.assigned_customer_service_id);
  const activitiesResult = await getEnquiryActivities(id);
  const activities = activitiesResult.success ? activitiesResult.activities : [];

  return (
    <EnquiryDetailClient
      enquiry={enquiry}
      assignedCSName={assignedCSName}
      initialActivities={activities}
    />
  );
}