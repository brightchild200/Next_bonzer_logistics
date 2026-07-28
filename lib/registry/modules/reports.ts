import { BarChart3, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const reports: ModuleConfig = {
  id: 'reports',
  title: 'Reports',
  route: '/reports',
  icon: BarChart3,
  category: ModuleCategory.REPORTS,
  permission: PERMISSIONS.JOB.READ,
  order: 1,
  enabled: true,
};