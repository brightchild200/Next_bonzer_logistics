'use client';

import { ModulePlaceholder } from '@/components/module-placeholder';
import { Receipt } from 'lucide-react';

export default function QuotationsPage() {
  return (
    <ModulePlaceholder
      title="Quotations"
      description="Create, send, and track freight quotations linked to your enquiries."
      icon={Receipt}
      features={[
        { title: 'Auto-generated quotes', desc: 'Generate quotations from enquiries with pre-filled rates.' },
        { title: 'Multi-currency support', desc: 'Quote in USD, EUR, GBP, and 40+ currencies.' },
        { title: 'Validity tracking', desc: 'Set expiry dates and get alerts before quotes lapse.' },
        { title: 'PDF export', desc: 'Send branded quotation PDFs directly to customers.' },
      ]}
    />
  );
}
