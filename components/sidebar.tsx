'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronsLeft, X } from 'lucide-react';
import { navItems, type NavItem } from '@/lib/nav';
import { BonzerLogo } from '@/components/bonzer-logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/auth/permissions';

function filterNavItems(items: NavItem[], can: (permission: Permission) => boolean): NavItem[] {
  return items
    .map((item) => {
      if (item.permission && !can(item.permission)) {
        return null;
      }
      if (item.children) {
        const filteredChildren = filterNavItems(item.children, can);
        if (filteredChildren.length === 0) {
          return null;
        }
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter((item): item is NavItem => item !== null);
}

export function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const { can } = usePermissions();

  const visibleItems = useMemo(() => filterNavItems(navItems, can), [can]);

  const toggleGroup = (href: string) => {
    setExpandedGroups((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isGroupExpanded = (href: string) => expandedGroups.includes(href);

  const isGroupActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className={cn('overflow-hidden', collapsed && 'lg:hidden')}>
            <BonzerLogo size="md" />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronsLeft
                className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {visibleItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const active = isGroupActive(item.href);
              const expanded = isGroupExpanded(item.href);
              const Icon = item.icon;

              if (hasChildren) {
                return (
                  <div key={item.href} className="group">
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.href)}
                      className={cn(
                        'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        collapsed && 'lg:justify-center lg:px-0'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className={cn('flex-1 truncate', collapsed && 'lg:hidden')}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className={cn(
                            'rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary',
                            collapsed && 'lg:hidden'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                      {!collapsed && (
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform',
                            expanded && 'rotate-180'
                          )}
                        />
                      )}
                    </button>
                    {!collapsed && expanded && (
                      <div className="mt-1 ml-8 space-y-1 border-l border-border pl-2">
                        {item.children!.map((child) => {
                          const childActive =
                            pathname === child.href || pathname.startsWith(child.href + '/');
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all',
                                childActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              {childActive && (
                                <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                              )}
                              <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'lg:justify-center lg:px-0'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className={cn('flex-1', collapsed && 'lg:hidden')}>{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary',
                        collapsed && 'lg:hidden'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <div
            className={cn(
              'rounded-lg bg-muted/50 p-3',
              collapsed && 'lg:hidden'
            )}
          >
            <p className="text-xs font-semibold text-foreground">Bonzer Pro</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Enterprise plan · Unlimited
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}