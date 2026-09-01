'use client';

import { useRouter } from 'next/navigation';
import { EnquiryForm } from '@/components/enquiry-form';
import type { Customer } from '@/lib/actions/customers/types';

interface EnquiryNewClientProps {
  customers: Customer[];
}

export function EnquiryNewClient({ customers }: EnquiryNewClientProps) {
  const router = useRouter();

  return (
    <EnquiryForm
      open
      customers={customers}
      setOpen={(open) => {
        if (!open) {
          router.push('/enquiries');
        }
      }}
      onSaved={() => router.push('/enquiries')}
    />
  );
}
