import { Receipt, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const pricing: ModuleConfig = {
  id: 'pricing',
  title: 'Pricing',
  route: '/pricing',
  icon: Receipt,
  category: ModuleCategory.PRICING,
  permission: PERMISSIONS.PRICING.READ,
  order: 1,
  enabled: true,
};