'use client';

import * as React from 'react';
import { Sidebar } from '@/components/cs/sidebar';
import { Header } from '@/components/cs/header';
import { DataStatusBanner } from '@/components/cs/data-status-banner';
import { CsProvider } from '@/lib/cs-store';

export default function CsLayout({ children }: { children: React.ReactNode }) {
  return (
    <CsProvider>
      <div className="flex min-h-screen bg-slate-50">
        <div className="hidden lg:block">
          <Sidebar className="sticky top-0 h-screen" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 lg:p-6">
            <DataStatusBanner />
            {children}
          </main>
        </div>
      </div>
    </CsProvider>
  );
}
