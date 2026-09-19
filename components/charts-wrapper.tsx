'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton, ChartSkeletonSmall } from '@/components/chart-skeleton';

const RevenueTrendChart = dynamic(
  () => import('@/components/charts').then((m) => m.RevenueTrendChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={280} />,
  }
);

const ShipmentTrendChart = dynamic(
  () => import('@/components/charts').then((m) => m.ShipmentTrendChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={280} />,
  }
);

const ModeSplitChart = dynamic(
  () => import('@/components/charts').then((m) => m.ModeSplitChart),
  {
    ssr: false,
    loading: () => <ChartSkeletonSmall height={220} />,
  }
);

const ImportExportChart = dynamic(
  () => import('@/components/charts').then((m) => m.ImportExportChart),
  {
    ssr: false,
    loading: () => <ChartSkeletonSmall height={220} />,
  }
);

const CustomerGrowthChart = dynamic(
  () => import('@/components/charts').then((m) => m.CustomerGrowthChart),
  {
    ssr: false,
    loading: () => <ChartSkeletonSmall height={220} />,
  }
);

export {
  RevenueTrendChart,
  ShipmentTrendChart,
  ModeSplitChart,
  ImportExportChart,
  CustomerGrowthChart,
};