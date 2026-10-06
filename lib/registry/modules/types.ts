import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@/lib/auth/permissions';

export const ModuleCategory = {
  CUSTOMERS: 'customers' as const,
  INTERACTIONS: 'interactions' as const,
  ENQUIRIES: 'enquiries' as const,
  PRICING: 'pricing' as const,
  JOBS: 'jobs' as const,
  OPERATIONS: 'operations' as const,
  ACCOUNTS: 'accounts' as const,
  REPORTS: 'reports' as const,
  ADMIN: 'admin' as const,
  DASHBOARD: 'dashboard' as const,
} as const;

export type ModuleCategory = (typeof ModuleCategory)[keyof typeof ModuleCategory];

export type ModuleConfig = {
  id: string;
  title: string;
  route: string;
  icon: LucideIcon;
  category: ModuleCategory;
  permission: Permission;
  order: number;
  enabled: boolean;
};

export type ModuleRegistry = Record<string, ModuleConfig>;