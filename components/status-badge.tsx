import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; className: string }> = {
  // Enquiry
  new: { label: 'New', className: 'bg-primary/10 text-primary border-primary/20' },
  quoted: { label: 'Quoted', className: 'bg-info/10 text-info border-info/20' },
  won: { label: 'Won', className: 'bg-success/10 text-success border-success/20' },
  lost: { label: 'Lost', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground border-border' },
  // Shipment
  booked: { label: 'Booked', className: 'bg-primary/10 text-primary border-primary/20' },
  in_transit: { label: 'In Transit', className: 'bg-info/10 text-info border-info/20' },
  customs: { label: 'At Customs', className: 'bg-warning/10 text-warning border-warning/20' },
  delivered: { label: 'Delivered', className: 'bg-success/10 text-success border-success/20' },
  on_hold: { label: 'On Hold', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  // Invoice
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Sent', className: 'bg-info/10 text-info border-info/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
  overdue: { label: 'Overdue', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  // Customer
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground border-border' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
