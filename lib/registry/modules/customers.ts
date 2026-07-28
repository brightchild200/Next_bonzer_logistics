import { Building2, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const customers: ModuleConfig = {
  id: 'customers',
  title: 'Customers',
  route: '/customers',
  icon: Building2,
  category: ModuleCategory.CUSTOMERS,
  permission: PERMISSIONS.CUSTOMER.READ,
  order: 1,
  enabled: true,
};