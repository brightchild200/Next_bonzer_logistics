import type { ActivityLog } from '@/lib/actions/dashboard/get-activities';

interface ActivityFeedProps {
  activities: ActivityLog[];
  loading?: boolean;
}

export function ActivityFeed({ activities, loading = false }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="animate-pulse h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="animate-pulse h-3 w-3/4 bg-muted" />
              <div className="animate-pulse h-2.5 w-1/3 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center text-center">
        <svg className="mb-2 h-8 w-8 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground/60">
          Actions across your workspace will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="h-[280px] overflow-y-auto pr-2 space-y-1">
      {activities.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
        >
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-tight">{a.action}</p>
            {a.description && (
              <p className="text-xs text-muted-foreground">{a.description}</p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              {new Date(a.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}