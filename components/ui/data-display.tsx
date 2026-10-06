'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface SearchFiltersProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterConfig[];
  activeFilters?: Record<string, string | string[]>;
  onFilterChange: (key: string, value: string | string[]) => void;
  onClearFilters?: () => void;
  className?: string;
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange';
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | string[];
}

export function SearchFilters({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  className,
}: SearchFiltersProps) {
  const hasActiveFilters = Object.keys(activeFilters).some(
    (key) => activeFilters[key] && (Array.isArray(activeFilters[key]) ? activeFilters[key].length > 0 : activeFilters[key])
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          className="pl-9"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filter Bar */}
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <FilterControl
              key={filter.key}
              filter={filter}
              value={activeFilters[filter.key]}
              onChange={(value) => onFilterChange(filter.key, value)}
            />
          ))}

          {hasActiveFilters && onClearFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={onClearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {Object.entries(activeFilters).map(([key, value]) => {
            const filterConfig = filters.find((f) => f.key === key);
            if (!value || (Array.isArray(value) && value.length === 0)) return null;

            const values = Array.isArray(value) ? value : [value];
            return values.map((v) => (
              <Badge
                key={`${key}-${v}`}
                variant="outline"
                className="gap-1"
                onClick={() => onFilterChange(key, '')}
              >
                {filterConfig?.label || key}: {v}
                <X className="h-3 w-3" />
              </Badge>
            ));
          })}
        </div>
      )}
    </div>
  );
}

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  if (filter.type === 'select') {
    return (
      <Select value={(value as string) || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[160px]">
          <Filter className="mr-2 h-3.5 w-3.5" />
          <SelectValue placeholder={filter.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {filter.options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return null;
}

/* Table Toolbar Component */
interface TableToolbarProps {
  title?: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterConfig[];
  activeFilters?: Record<string, string | string[]>;
  onFilterChange: (key: string, value: string | string[]) => void;
  onClearFilters?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function TableToolbar({
  title,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  actions,
  className,
}: TableToolbarProps) {
  const hasActiveFilters = Object.keys(activeFilters).some(
    (key) => activeFilters[key] && (Array.isArray(activeFilters[key]) ? activeFilters[key].length > 0 : activeFilters[key])
  );

  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="flex-1 min-w-0">
        {title && <h3 className="font-display text-base font-semibold mb-2">{title}</h3>}
        <SearchFilters
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={onFilterChange}
          onClearFilters={onClearFilters}
        />
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 lg:ml-4">
          {actions}
        </div>
      )}
    </div>
  );
}

/* Empty State Component */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)}>
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          {icon}
        </div>
      )}
      <p className="mt-4 text-base font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* Loading State Component */
interface LoadingStateProps {
  variant?: 'skeleton' | 'spinner' | 'inline';
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingState({ variant = 'skeleton', rows = 5, columns = 4, className }: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-24" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* Card Skeleton */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-5', className)}>
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-1/4 mt-3" />
    </div>
  );
}

/* Image Upload Field */
interface ImageUploadFieldProps {
  id?: string;
  label?: string;
  description?: string;
  previewUrl: string | null;
  onFileSelected: (file: File) => void;
  onClear: () => void;
  accept?: string;
  disabled?: boolean;
  error?: string | null;
  className?: string;
}

export function ImageUploadField({
  id,
  label = 'Upload Photo',
  description,
  previewUrl,
  onFileSelected,
  onClear,
  accept = 'image/*',
  disabled,
  error,
  className,
}: ImageUploadFieldProps) {
  const inputId = id ?? 'image-upload-field';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    // Reset input so selecting the same file again re-triggers.
    event.target.value = '';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}

      {previewUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="h-40 w-40 rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
            onClick={onClear}
            disabled={disabled}
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            'flex h-40 w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground transition-colors',
            disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-primary hover:text-primary'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <ImageIconPlaceholder />
          <span className="text-xs font-medium">Click to upload</span>
        </label>
      )}

      <input
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />

      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ImageIconPlaceholder() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

/* Page Skeleton */
export function PageSkeleton() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      <LoadingState rows={6} columns={5} />
    </div>
  );
}