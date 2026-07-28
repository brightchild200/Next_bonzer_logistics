import { FileText, type LucideIcon } from 'lucide-react';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ModuleConfig } from './types';
import { ModuleCategory } from './types';

export const enquiries: ModuleConfig = {
  id: 'enquiries',
  title: 'Enquiries',
  route: '/enquiries',
  icon: FileText,
  category: ModuleCategory.ENQUIRIES,
  permission: PERMISSIONS.ENQUIRY.READ,
  order: 2,
  enabled: true,
};