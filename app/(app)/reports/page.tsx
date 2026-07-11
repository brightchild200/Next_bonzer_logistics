'use client';

import { ModulePlaceholder } from '@/components/module-placeholder';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Generate detailed operational and financial reports across your logistics business."
      icon={BarChart3}
      features={[
        { title: 'Custom report builder', desc: 'Drag-and-drop fields to build the exact report you need.' },
        { title: 'Scheduled reports', desc: 'Automatically email reports to stakeholders on a schedule.' },
        { title: 'Pre-built templates', desc: 'Start from 20+ industry-standard logistics report templates.' },
        { title: 'Multi-format export', desc: 'Export to PDF, Excel, CSV, or share via secure link.' },
      ]}
    />
  );
}
