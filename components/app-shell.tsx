'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { CommandPalette } from '@/components/command-palette';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} onCmdOpen={() => setCmdOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </div>
  );
}
