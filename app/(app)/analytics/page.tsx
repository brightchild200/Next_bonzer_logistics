'use client';

import { ModulePlaceholder } from '@/components/module-placeholder';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <ModulePlaceholder
      title="Analytics"
      description="Deep-dive into performance metrics, lane analytics, and predictive insights."
      icon={BarChart3}
      features={[
        { title: 'Lane performance', desc: 'Analyze cost, transit time, and reliability per shipping lane.' },
        { title: 'Carrier scorecards', desc: 'Compare carriers on on-time delivery, claims, and cost.' },
        { title: 'Predictive forecasting', desc: 'AI-powered demand and revenue forecasting by season.' },
        { title: 'Custom dashboards', desc: 'Build role-specific dashboards for ops, finance, and sales.' },
      ]}
    />
  );
}
