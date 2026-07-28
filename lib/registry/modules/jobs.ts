import { Package, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const jobs: ModuleConfig = {
  id: 'jobs',
  title: 'Jobs',
  route: '/jobs',
  icon: Package,
  category: ModuleCategory.JOBS,
  permission: PERMISSIONS.JOB.READ,
  order: 1,
  enabled: true,
};