import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Receipt,
  Package,
  FileBarChart,
  BarChart3,
  Settings,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/lib/auth/permissions';
import { PERMISSIONS } from '@/lib/auth/permissions';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  permission?: Permission;
  children?: NavItem[];
};

/**
 * Central navigation configuration.
 * Each item can specify a required permission for visibility.
 * Permission strings reference PERMISSIONS constants - no magic strings.
 */
export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Enquiries', href: '/enquiries', icon: FileText, badge: 'New', permission: 'enquiry:read_team' },
  { label: 'Customer Interactions', href: '/customer-interactions', icon: MessageSquare, permission: PERMISSIONS.INTERACTION.READ_ALL },
  {
    label: 'Admin',
    href: '/admin',
    icon: Users,
    permission: PERMISSIONS.ADMIN.USER_READ,
    children: [
      { label: 'Employees', href: '/admin/employees', icon: Users, permission: PERMISSIONS.ADMIN.USER_READ },
      { label: 'Customers', href: '/admin/customers', icon: Building2, permission: PERMISSIONS.CUSTOMER.READ },
    ],
  },
  { label: 'Quotations', href: '/quotations', icon: Receipt, permission: PERMISSIONS.PRICING.READ },
  { label: 'Shipments', href: '/shipments', icon: Package, permission: PERMISSIONS.JOB.READ },
  { label: 'Invoices', href: '/invoices', icon: FileBarChart, permission: PERMISSIONS.JOB.READ },
  { label: 'Reports', href: '/reports', icon: BarChart3, permission: PERMISSIONS.JOB.READ },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, permission: PERMISSIONS.JOB.READ },
  { label: 'Settings', href: '/settings', icon: Settings, permission: PERMISSIONS.ADMIN.USER_READ },
];