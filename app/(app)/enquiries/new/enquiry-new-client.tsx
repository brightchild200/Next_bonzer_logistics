'use client';

import { useRouter } from 'next/navigation';
import { EnquiryForm } from '@/components/enquiry-form';

export function EnquiryNewClient() {
  const router = useRouter();

  return (
    <EnquiryForm
      open
      setOpen={(open) => {
        if (!open) {
          router.push('/enquiries');
        }
      }}
      onSaved={() => router.push('/enquiries')}
    />
  );
}