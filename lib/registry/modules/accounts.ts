import { FileBarChart, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const accounts: ModuleConfig = {
  id: 'accounts',
  title: 'Accounts',
  route: '/accounts',
  icon: FileBarChart,
  category: ModuleCategory.ACCOUNTS,
  permission: PERMISSIONS.JOB.READ,
  order: 1,
  enabled: true,
};