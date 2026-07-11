'use client';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import { Sparkles, ArrowRight } from 'lucide-react';

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  features,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  features: { title: string; desc: string }[];
}) {
  return (
    <div className="animate-fade-in">
      <PageHeader title={title} description={description}>
        <Button size="sm" className="gap-1.5">
          <Sparkles className="h-4 w-4" /> Get started
        </Button>
      </PageHeader>

      <Card className="relative overflow-hidden p-8 lg:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-blue-500/20">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {title} module
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            {description} This module is part of the Bonzer ERP suite and connects
            seamlessly with your enquiries, shipments, and analytics.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card/50 p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          <Button className="mt-8 gap-1.5">
            Explore module <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
