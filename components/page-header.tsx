'use client';

import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export function PageHeader({
  title,
  description,
  children,
  className,
  breadcrumbs,
  actionAlign = 'end',
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItem[];
  actionAlign?: 'start' | 'center' | 'end' | 'between';
}) {
  const hasActions = !!children;
  const justifyClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }[actionAlign];

  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4" aria-label="Breadcrumb">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={crumb.label}>
                  {crumb.href && !crumb.isCurrent ? (
                    <BreadcrumbLink asChild>
                      <a href={crumb.href}>{crumb.label}</a>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </nav>
      )}

      {/* Title & Actions */}
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-center',
          hasActions ? justifyClass : '',
        )}
      >
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children && (
          <div
            className={cn(
              'flex items-center gap-2 shrink-0',
              actionAlign === 'between' && 'ml-4',
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export { PageHeader as PageHeaderClient };
