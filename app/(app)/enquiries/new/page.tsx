import { listCustomers } from '@/lib/actions/customers/list-customers';
import { EnquiryNewClient } from './enquiry-new-client';

export default async function NewEnquiryPage() {
  const customersRes = await listCustomers({ pageSize: 100 });
  const customers = customersRes.success ? customersRes.customers : [];

  return <EnquiryNewClient customers={customers} />;
}
