import { BonzerLogo } from '@/components/bonzer-logo';

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse">
          <BonzerLogo size="lg" />
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-[shimmer_1.5s_infinite] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
