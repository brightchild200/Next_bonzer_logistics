'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { stickyHeader?: boolean; maxHeight?: string }
>(({ className, stickyHeader, maxHeight, ...props }, ref) => (
  <div className={cn('relative w-full overflow-auto', stickyHeader && 'overflow-y-auto', maxHeight && `max-h-${maxHeight}`)}>
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }
>(({ className, sticky, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      '[&_tr]:border-b',
      sticky && 'sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border',
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    selectable?: boolean;
    selected?: boolean;
    clickable?: boolean;
  }
>(({ className, selectable, selected, clickable, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors duration-150',
      'data-[state=selected]:bg-muted',
      selectable && 'cursor-pointer',
      clickable && 'cursor-pointer hover:bg-muted/50',
      selected && 'bg-primary/5',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { width?: string; sortable?: boolean }
>(({ className, width, sortable, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-11 px-4 text-left align-middle font-medium text-muted-foreground',
      '[&:has([role=checkbox])]:pr-0',
      width && `w-[${width}]`,
      sortable && 'cursor-pointer select-none hover:text-foreground',
      className,
    )}
    {...props}
  >
    <div className="flex items-center gap-1.5">
      {children}
      {sortable && (
        <span className="inline-flex items-center text-muted-foreground/50">
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </div>
  </th>
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { width?: string }
>(({ className, width, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-4 align-middle',
      '[&:has([role=checkbox])]:pr-0',
      width && `w-[${width}]`,
      className,
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

interface TableSkeletonProps {
  rows?: number;
  columns: number;
  columnWidths?: string[];
}

function TableSkeleton({ rows = 5, columns, columnWidths }: TableSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j} className="p-4">
              <Skeleton className={cn('h-4', columnWidths?.[j] ? `w-[${columnWidths[j]}]` : 'w-24')} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

interface TableEmptyStateProps {
  colSpan: number;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function TableEmptyState({
  colSpan,
  icon,
  title,
  description,
  action,
  className,
}: TableEmptyStateProps) {
  return (
    <TableBody>
      <TableRow>
        <TableCell colSpan={colSpan} className={cn('py-12', className)}>
          <div className="flex flex-col items-center justify-center text-center">
            {icon && (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                {icon}
              </div>
            )}
            <p className="mt-4 text-base font-semibold">{title}</p>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
          </div>
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  showPageSize = false,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
}: PaginationProps) {
  const start = currentPage * pageSize + 1;
  const end = Math.min((currentPage + 1) * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{totalItems}</strong> results
        </span>
        {showPageSize && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 w-auto rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Previous
        </Button>
        <span className="px-3 text-sm text-muted-foreground" aria-current="page">
          Page {currentPage + 1} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableSkeleton,
  TableEmptyState,
  TablePagination,
};