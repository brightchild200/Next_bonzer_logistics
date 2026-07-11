import { cn } from '@/lib/utils';

export function BonzerLogo({
  className,
  showText = true,
  size = 'md',
}: {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = {
    sm: { box: 'h-7 w-7', icon: 16, text: 'text-base' },
    md: { box: 'h-9 w-9', icon: 20, text: 'text-lg' },
    lg: { box: 'h-12 w-12', icon: 28, text: 'text-2xl' },
  }[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/25',
          dims.box
        )}
      >
        <svg
          width={dims.icon}
          height={dims.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 7L12 2L21 7M3 7V17L12 22M3 7L12 12M21 7V17L12 22M21 7L12 12M12 22V12"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <span className={cn('font-display font-bold tracking-tight', dims.text)}>
          Bonzer
        </span>
      )}
    </div>
  );
}
