import { MessageSquare, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const interactions: ModuleConfig = {
  id: 'interactions',
  title: 'Interactions',
  route: '/interactions',
  icon: MessageSquare,
  category: ModuleCategory.INTERACTIONS,
  permission: PERMISSIONS.ENQUIRY.READ,
  order: 1,
  enabled: true,
};