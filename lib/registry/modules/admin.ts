import { Users, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const admin: ModuleConfig = {
  id: 'admin',
  title: 'Admin',
  route: '/admin',
  icon: Users,
  category: ModuleCategory.ADMIN,
  permission: PERMISSIONS.ADMIN.USER_READ,
  order: 1,
  enabled: true,
};