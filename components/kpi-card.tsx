'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type KpiData = {
  label: string;
  value: string;
  change: number;
  icon: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  sparkline?: number[];
  trend?: 'up' | 'down' | 'neutral';
  subtext?: string;
};

const accentMap = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-info/10 text-info border-info/20',
};

const accentBgMap = {
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  destructive: 'bg-destructive/10',
  info: 'bg-info/10',
};

export function KpiCard({ data, index = 0, className }: { data: KpiData; index?: number; className?: string }) {
  const Icon = data.icon;
  const positive = data.change >= 0;
  const trend = data.trend ?? (positive ? 'up' : 'down');

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-foreground/5',
        'border border-border/50',
        className,
      )}
      style={{ animation: `slideUp 0.4s ease-out ${index * 0.05}s both` }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {data.label}
            </p>
            <p className="font-display text-2xl font-bold tracking-tight text-foreground truncate">
              {data.value}
            </p>
            {data.subtext && (
              <p className="text-xs text-muted-foreground">{data.subtext}</p>
            )}
          </div>
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
              accentBgMap[data.accent ?? 'primary'],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <span
            className={cn(
              'flex items-center gap-1 text-xs font-semibold',
              positive ? 'text-success' : 'text-destructive',
            )}
          >
            {trend === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <span className="h-3.5 w-3.5" aria-hidden="true">—</span>
            )}
            {Math.abs(data.change)}%
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>

        {/* Sparkline */}
        {data.sparkline && (
          <div className="mt-4 flex h-10 items-end gap-1" role="img" aria-label={`Trend: ${data.sparkline.join(', ')}`}>
            {data.sparkline.map((v, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-sm transition-all duration-300',
                  accentBgMap[data.accent ?? 'primary'],
                )}
                style={{
                  height: `${(v / Math.max(...data.sparkline!)) * 100}%`,
                  opacity: 0.5 + (v / Math.max(...data.sparkline!)) * 0.5,
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
