'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { BonzerLogo } from '@/components/bonzer-logo';
import { Ship, Plane, Truck, Globe2, TrendingUp, ShieldCheck } from 'lucide-react';

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left: form */}
      <div className="flex w-full flex-col px-6 py-8 sm:px-12 lg:w-[480px] lg:px-10 xl:w-[540px]">
        <div className="flex items-center justify-between">
          <BonzerLogo size="md" />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 animate-slide-up">
              <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bonzer ERP · International Logistics Platform
        </p>
      </div>

      {/* Right: visual */}
      <div className="relative hidden overflow-hidden bg-sidebar lg:block lg:flex-1">
        <div className="absolute inset-0 bg-grid opacity-[0.07]" />
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-1/4 right-10 h-80 w-80 rounded-full bg-blue-500/15 blur-[120px]" />

        <div className="relative flex h-full flex-col justify-center px-16 xl:px-24">
          <div className="max-w-lg animate-slide-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-sidebar-foreground/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Trusted by 500+ logistics companies
            </div>
            <h2 className="font-display text-4xl font-bold leading-tight text-sidebar-foreground xl:text-5xl">
              Move freight
              <br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                smarter, faster,
              </span>
              <br />
              worldwide.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-sidebar-foreground/60">
              The intelligent ERP for international freight forwarding — manage
              enquiries, shipments, invoices, and analytics from a single,
              data-driven command center.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { icon: Globe2, label: '190+ countries' },
                { icon: TrendingUp, label: '32% avg. growth' },
                { icon: ShieldCheck, label: 'SOC 2 compliant' },
                { icon: Ship, label: 'Air · Sea · Land' },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-sidebar-foreground/80">
                      {f.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating mode badges */}
          <div className="absolute bottom-12 right-12 flex gap-3">
            {[Ship, Plane, Truck].map((Icon, i) => (
              <div
                key={i}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition-transform hover:scale-110"
                style={{ animation: `slideUp 0.5s ease-out ${i * 0.1}s both` }}
              >
                <Icon className="h-5 w-5 text-sidebar-foreground/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
