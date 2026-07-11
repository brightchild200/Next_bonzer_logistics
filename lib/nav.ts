import {
  LayoutDashboard,
  FileText,
  Users,
  Receipt,
  Package,
  FileBarChart,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Enquiries', href: '/enquiries', icon: FileText, badge: 'New' },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Quotations', href: '/quotations', icon: Receipt },
  { label: 'Shipments', href: '/shipments', icon: Package },
  { label: 'Invoices', href: '/invoices', icon: FileBarChart },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];
