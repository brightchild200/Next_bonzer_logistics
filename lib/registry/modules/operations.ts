import { Settings, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const operations: ModuleConfig = {
  id: 'operations',
  title: 'Operations',
  route: '/operations',
  icon: Settings,
  category: ModuleCategory.OPERATIONS,
  permission: PERMISSIONS.JOB.READ,
  order: 1,
  enabled: true,
};