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
  Flag,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import type { Permission } from '@/lib/auth/permissions';
import { PERMISSIONS } from '@/lib/auth/permissions';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  permissions?: Permission[];
  children?: NavItem[];
};

/**
 * Central navigation configuration.
 * A navigation item is visible if the user has ANY of the listed permissions.
 */
export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },

  {
    label: 'Enquiries',
    href: '/enquiries',
    icon: FileText,
    badge: 'New',
    permissions: [
      PERMISSIONS.ENQUIRY.READ_TEAM,
      PERMISSIONS.ENQUIRY.READ_OWN,
    ],
  },

  {
    label: 'Customer Interactions',
    href: '/customer-interactions',
    icon: MessageSquare,
    permissions: [
      PERMISSIONS.INTERACTION.READ_ALL,
      PERMISSIONS.INTERACTION.READ_OWN,
    ],
  },

  {
    label: 'Follow-ups',
    href: '/follow-ups',
    icon: Flag,
    permissions: [
      PERMISSIONS.FOLLOW_UP.READ_ALL,
      PERMISSIONS.FOLLOW_UP.READ_OWN,
    ],
  },

  {
    label: 'KYC',
    href: '/kyc',
    icon: ShieldCheck,
    permissions: [
      PERMISSIONS.KYC.READ,
      PERMISSIONS.KYC.UPDATE,
    ],
  },

  {
    label: 'Admin',
    href: '/admin',
    icon: Users,
    permissions: [
      PERMISSIONS.ADMIN.USER_READ,
    ],
    children: [
      {
        label: 'Employees',
        href: '/admin/employees',
        icon: Users,
        permissions: [
          PERMISSIONS.ADMIN.USER_READ,
        ],
      },
      {
        label: 'Customers',
        href: '/admin/customers',
        icon: Building2,
        permissions: [
          PERMISSIONS.CUSTOMER.READ,
        ],
      },
    ],
  },

  {
    label: 'Quotations',
    href: '/quotations',
    icon: Receipt,
    permissions: [
      PERMISSIONS.PRICING.READ,
    ],
  },

  {
    label: 'Shipments',
    href: '/shipments',
    icon: Package,
    permissions: [
      PERMISSIONS.JOB.READ,
    ],
  },

  {
    label: 'Invoices',
    href: '/invoices',
    icon: FileBarChart,
    permissions: [
      PERMISSIONS.JOB.READ,
    ],
  },

  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permissions: [
      PERMISSIONS.JOB.READ,
    ],
  },

  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    permissions: [
      PERMISSIONS.JOB.READ,
    ],
  },

  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    permissions: [
      PERMISSIONS.ADMIN.USER_READ,
    ],
  },
];
