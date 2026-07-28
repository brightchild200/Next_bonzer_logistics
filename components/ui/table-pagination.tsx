'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

interface UsePaginationOptions {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export function usePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  siblingCount = 1,
}: UsePaginationOptions) {
  const startItem = useMemo(() => currentPage * pageSize + 1, [currentPage, pageSize]);
  const endItem = useMemo(() => Math.min((currentPage + 1) * pageSize, totalItems), [currentPage, pageSize, totalItems]);

  const pages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const pages: (number | 'ellipsis')[] = [0];
    const leftBound = Math.max(1, currentPage - siblingCount);
    const rightBound = Math.min(totalPages - 2, currentPage + siblingCount);

    if (leftBound > 1) {
      pages.push('ellipsis');
    }

    for (let i = leftBound; i <= rightBound; i++) {
      pages.push(i);
    }

    if (rightBound < totalPages - 2) {
      pages.push('ellipsis');
    }

    pages.push(totalPages - 1);
    return pages;
  }, [currentPage, totalPages, siblingCount]);

  return {
    pages,
    startItem,
    endItem,
    totalItems,
    goToPage: onPageChange,
    previousPage: () => onPageChange(Math.max(0, currentPage - 1)),
    nextPage: () => onPageChange(Math.min(totalPages - 1, currentPage + 1)),
    hasPrevious: currentPage > 0,
    hasNext: currentPage < totalPages - 1,
  };
}

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: TablePaginationProps) {
  const pagination = usePagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
  });

  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center justify-between border-t border-border px-4 py-3', className)}>
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{pagination.startItem}</span> to{' '}
        <span className="font-medium">{pagination.endItem}</span> of{' '}
        <span className="font-medium">{pagination.totalItems}</span> results
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={pagination.previousPage}
              disabled={!pagination.hasPrevious}
              aria-disabled={!pagination.hasPrevious}
            />
          </PaginationItem>
          {pagination.pages.map((page, index) =>
            page === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => pagination.goToPage(page)}
                  aria-label={`Page ${page + 1}`}
                >
                  {page + 1}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={pagination.nextPage}
              disabled={!pagination.hasNext}
              aria-disabled={!pagination.hasNext}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}