'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Truck,
  Plane,
  Ship,
  Train,
  FileText,
  DollarSign,
  UserCheck,
  UserX,
  Archive,
  RotateCcw,
  MinusCircle,
  CircleHelp,
} from 'lucide-react';

interface StatusConfig {
  label: string;
  className: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const statusConfig: Record<string, StatusConfig> = {
  // Enquiry
  new: { label: 'New', className: 'bg-primary/10 text-primary border-primary/20', icon: FileText },
  quoted: { label: 'Quoted', className: 'bg-info/10 text-info border-info/20', icon: DollarSign },
  won: { label: 'Won', className: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  lost: { label: 'Lost', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground border-border', icon: Archive },
  // Shipment
  booked: { label: 'Booked', className: 'bg-primary/10 text-primary border-primary/20', icon: Package },
  in_transit: { label: 'In Transit', className: 'bg-info/10 text-info border-info/20', icon: Truck },
  customs: { label: 'At Customs', className: 'bg-warning/10 text-warning border-warning/20', icon: Shield },
  delivered: { label: 'Delivered', className: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  on_hold: { label: 'On Hold', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
  // Invoice
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border', icon: FileText },
  sent: { label: 'Sent', className: 'bg-info/10 text-info border-info/20', icon: DollarSign },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  overdue: { label: 'Overdue', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
  // Customer KYC
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  submitted: { label: 'Submitted', className: 'bg-info/10 text-info border-info/20', icon: RotateCcw },
  verified: { label: 'Verified', className: 'bg-success/10 text-success border-success/20', icon: UserCheck },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: UserX },
  // Customer active/inactive
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20', icon: UserCheck },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground border-border', icon: UserX },
  // Generic
  processing: { label: 'Processing', className: 'bg-info/10 text-info border-info/20', icon: Loader2 },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  unknown: { label: 'Unknown', className: 'bg-muted text-muted-foreground border-border', icon: CircleHelp },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'outline' | 'solid' | 'soft';
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  variant = 'outline',
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.unknown;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const variantClasses = {
    outline: 'border',
    solid: 'border-0',
    soft: 'border bg-opacity-10',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center font-medium transition-colors',
        sizeClasses[size],
        variantClasses[variant],
        config.className,
        className,
      )}
    >
      {showIcon && Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      <span>{config.label}</span>
    </Badge>
  );
}

export function StatusDot({ status, size = 'md', className }: { status: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const config = statusConfig[status] ?? statusConfig.unknown;

  const sizeMap = { sm: 'h-1.5 w-1.5', md: 'h-2.5 w-2.5', lg: 'h-3.5 w-3.5' };
  const colorMap: Record<string, string> = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
    info: 'bg-info',
    muted: 'bg-muted-foreground',
  };

  const colorClass = Object.entries(colorMap).find(([key]) => config.className.includes(key))?.[1] ?? 'bg-muted-foreground';

  return (
    <span
      className={cn('inline-block rounded-full', sizeMap[size], colorClass, className)}
      aria-label={config.label}
    />
  );
}

export { statusConfig };