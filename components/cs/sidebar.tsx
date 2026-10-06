'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, ClipboardList, FileText, PackageSearch, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCs } from '@/lib/cs-store';

const navItems = [
  { href: '/cs/enquiries', label: 'Enquiries', icon: ClipboardList },
  { href: '/cs/quick-dsr', label: 'Quick DSR', icon: FileText },
  { href: '/cs/track', label: 'Live Tracking', icon: PackageSearch },
  { href: '/cs/documents', label: 'Documents', icon: FolderOpen },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { currentUser } = useCs();

  return (
    <aside className={cn('flex h-full w-64 flex-col border-r border-slate-200 bg-white', className)}>
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-heading text-[15px] font-bold text-slate-900">Bonzer</p>
          <p className="text-[11px] font-medium text-slate-500">Logistics CS</p>
        </div>
      </div>

      <div className="px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Customer Service
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-semibold text-white">
            {currentUser ? initials(currentUser.name) : '?'}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-slate-800">
              {currentUser ? currentUser.name : 'No user selected'}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {currentUser ? 'Working as' : 'Pick one from the top bar'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
