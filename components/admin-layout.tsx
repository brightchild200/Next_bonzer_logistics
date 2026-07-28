'use client';

import { useState } from 'react';
import { AdminSidebar } from '@/components/admin-sidebar';
import { CommandPalette } from '@/components/command-palette';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Admin secondary sidebar - fixed on the left of the admin workspace */}
      <AdminSidebar collapsed={adminCollapsed} setCollapsed={setAdminCollapsed} />

      {/* Admin workspace content - offset by admin sidebar width */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          adminCollapsed ? 'lg:pl-16' : 'lg:pl-56'
        }`}
      >
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </div>
  );
}