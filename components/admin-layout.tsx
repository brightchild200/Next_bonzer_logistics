'use client';
import { useState } from "react";

import { CommandPaletteLoader } from '@/components/command-palette-loader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
      <CommandPaletteLoader open={cmdOpen} setOpen={setCmdOpen} />
    </div>
  );
}
