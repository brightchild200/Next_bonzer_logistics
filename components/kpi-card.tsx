'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type KpiData = {
  label: string;
  value: string;
  change: number;
  icon: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  sparkline?: number[];
};

const accentMap = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

export function KpiCard({ data, index = 0 }: { data: KpiData; index?: number }) {
  const Icon = data.icon;
  const positive = data.change >= 0;

  return (
    <Card
      className="group relative overflow-hidden p-5 transition-all hover:shadow-lg hover:shadow-foreground/5"
      style={{ animation: `slideUp 0.4s ease-out ${index * 0.05}s both` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {data.label}
          </p>
          <p className="font-display text-2xl font-bold tracking-tight">{data.value}</p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
            accentMap[data.accent ?? 'primary']
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            'flex items-center gap-0.5 text-xs font-semibold',
            positive ? 'text-success' : 'text-destructive'
          )}
        >
          {positive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {Math.abs(data.change)}%
        </span>
        <span className="text-xs text-muted-foreground">vs last month</span>
      </div>

      {/* Sparkline */}
      {data.sparkline && (
        <div className="mt-3 flex h-8 items-end gap-0.5">
          {data.sparkline.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-primary/20 transition-all group-hover:bg-primary/40"
              style={{ height: `${(v / Math.max(...data.sparkline!)) * 100}%` }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
