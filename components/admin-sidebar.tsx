'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Building2, ChevronsLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';

interface AdminSidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

interface AdminSection {
  label: string;
  href: string;
  icon: typeof Users;
  permission: Permission;
}

const adminSections: AdminSection[] = [
  { label: 'Employees', href: '/admin/employees', icon: Users, permission: PERMISSIONS.ADMIN.USER_READ },
  { label: 'Customers', href: '/admin/customers', icon: Building2, permission: PERMISSIONS.CUSTOMER.READ },
];

export function AdminSidebar({ collapsed, setCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleSections = adminSections.filter((section) => can(section.permission));

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-3">
        <div className={cn('overflow-hidden font-semibold text-sm', collapsed && 'hidden')}>
          Admin
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleSections.map((section) => {
          const active = pathname === section.href || pathname.startsWith(section.href + '/');
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center'
              )}
              title={collapsed ? section.label : undefined}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn('truncate', collapsed && 'hidden')}>{section.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}