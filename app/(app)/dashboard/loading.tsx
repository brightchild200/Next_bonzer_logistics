import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* PageHeader skeleton */}
      <div className="mb-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        <div className="mt-4 flex gap-4">
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* KPI Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-5 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-2" />
            <div className="h-8 w-32 bg-muted rounded mb-2" />
            <div className="h-3 w-16 bg-muted rounded" />
          </Card>
        ))}
      </div>

      {/* Charts row 1 skeleton */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
        <Card className="p-5 lg:col-span-2 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-64 bg-muted rounded mb-4" />
          <div className="h-[280px] w-full bg-muted rounded" />
        </Card>
        <Card className="p-5 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-4" />
          <div className="h-[220px] w-full bg-muted rounded" />
        </Card>
      </div>

      {/* Charts row 2 skeleton */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        <Card className="p-5 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-4" />
          <div className="h-[220px] w-full bg-muted rounded" />
        </Card>
        <Card className="p-5 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-4" />
          <div className="h-[220px] w-full bg-muted rounded" />
        </Card>
        <Card className="p-5 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-4" />
          <div className="h-[220px] w-full bg-muted rounded" />
        </Card>
      </div>

      {/* Widgets row skeleton */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
        <Card className="p-5 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-4" />
          <div className="h-[280px] w-full bg-muted rounded" />
        </Card>
        <Card className="p-5 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-4" />
          <div className="h-[280px] w-full bg-muted rounded" />
        </Card>
        <Card className="p-5 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-4" />
          <div className="h-[280px] w-full bg-muted rounded" />
        </Card>
      </div>

      {/* Quick Actions + Operational Status skeleton */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded mb-4" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-16 bg-muted rounded-lg" />
        </Card>
      </div>
    </div>
  );
}