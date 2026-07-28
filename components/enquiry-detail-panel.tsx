'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/status-badge';
import { supabase } from '@/lib/supabase';
import type { Enquiry, ActivityLog } from '@/lib/supabase';
import {
 MapPin,
 Package,
 Weight,
 Box,
 Calendar,
 FileText,
 Pencil,
 Trash2,
 Clock,
 Plane,
 Ship,
 Truck,
 Train,
 CheckCircle,
 XCircle,
 Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

const modeIcons: Record<string, typeof Plane> = {
  air: Plane,
  sea: Ship,
  road: Truck,
  rail: Train,
};

export function EnquiryDetailPanel({
  enquiry,
  open,
  setOpen,
  onEdit,
  onDeleted,
}: {
  enquiry: Enquiry | null;
  open: boolean;
  setOpen: (v: boolean) => void;
  onEdit: (e: Enquiry) => void;
  onDeleted: () => void;
}) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (enquiry) {
      supabase
        .from('activity_log')
        .select('*')
        .eq('entity_type', 'enquiry')
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }) => setActivities(data ?? []));
    }
  }, [enquiry]);

  if (!enquiry) return null;
  const ModeIcon = modeIcons[enquiry.mode] ?? Package;
  
  const updateStatus = async (
  status: string,
  timestampField?: string
) => {
  const updateData: any = {
    status,
  };

  if (timestampField) {
    updateData[timestampField] = new Date().toISOString();
  }

  const { error } = await supabase
    .from('enquiries')
    .update(updateData)
    .eq('id', enquiry.id);

  if (error) {
  console.error(error);
  return;
}


await supabase.from('activity_log').insert({
  entity_type: 'enquiry',
  action: `Status changed to ${status}`,
  description: enquiry.reference,
});


setOpen(false);
onDeleted();

  const handleDelete = async () => {
    const { error } = await supabase.from('enquiries').delete().eq('id', enquiry.id);
    if (error) return;
    await supabase.from('activity_log').insert({
      entity_type: 'enquiry',
      action: 'Deleted enquiry',
      description: enquiry.reference,
    });
    setOpen(false);
    onDeleted();
  };

  const timeline = [
    { label: 'Enquiry created', date: enquiry.created_at, done: true },
    { label: 'Quotation sent', date: null, done: enquiry.status !== 'new' },
    { label: 'Enquiry won', date: null, done: enquiry.status === 'won' },
    { label: 'Shipment booked', date: null, done: false },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="font-mono text-base">{enquiry.reference}</SheetTitle>
            <StatusBadge status={enquiry.status} />
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          {/* Customer */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer
            </p>
            <p className="mt-1 text-base font-semibold">
              {enquiry.customer_name ?? '—'}
            </p>
          </div>

          {/* Route */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ModeIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{enquiry.origin ?? '—'}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{enquiry.destination ?? '—'}</span>
                </div>
                <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                  {enquiry.mode} freight · {enquiry.incoterm ?? 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Package, label: 'Cargo Type', value: enquiry.cargo_type },
              { icon: Weight, label: 'Weight', value: enquiry.weight_kg ? `${enquiry.weight_kg} kg` : null },
              { icon: Box, label: 'Volume', value: enquiry.volume_cbm ? `${enquiry.volume_cbm} CBM` : null },
              {
                icon: Calendar,
                label: 'Expected Date',
                value: enquiry.expected_shipment_date
                  ? new Date(enquiry.expected_shipment_date).toLocaleDateString()
                  : null,
              },
            ].map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {d.label}
                  </div>
                  <p className="mt-1 text-sm font-medium">{d.value ?? '—'}</p>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          {enquiry.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 rounded-lg bg-muted/40 p-3 text-sm">{enquiry.notes}</p>
            </div>
          )}

          <Separator />

          {/* Activity Timeline */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Activity Timeline
            </p>
            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[10px]',
                        t.done
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {t.done ? '✓' : i + 1}
                    </div>
                    {i < timeline.length - 1 && (
                      <div
                        className={cn(
                          'h-6 w-0.5',
                          t.done ? 'bg-success/30' : 'bg-border'
                        )}
                      />
                    )}
                  </div>
                  <div className="pb-1">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        t.done ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {t.label}
                    </p>
                    {t.date && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Recent activity log */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Activity
            </p>
            <div className="space-y-2">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    <Clock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{a.action}</p>
                      {a.description && (
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Status Actions */}
<div className="space-y-2">

<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
  Workflow
</p>


<div className="flex flex-wrap gap-2">


{enquiry.status === 'new' && (
<Button
onClick={() =>
updateStatus(
'quoted',
'quoted_at'
)
}
>
<CheckCircle className="mr-2 h-4 w-4"/>
Mark Quoted
</Button>
)}


{enquiry.status === 'quoted' && (
<>
<Button
onClick={() =>
updateStatus(
'won',
'won_at'
)
}
>
<CheckCircle className="mr-2 h-4 w-4"/>
Mark Won
</Button>


<Button
variant="outline"
onClick={() =>
updateStatus(
'lost',
'lost_at'
)
}
>
<XCircle className="mr-2 h-4 w-4"/>
Mark Lost
</Button>
</>
)}


{enquiry.status === 'lost' && (
<Button
variant="outline"
onClick={() =>
updateStatus(
'archived',
'archived_at'
)
}
>
<Archive className="mr-2 h-4 w-4"/>
Archive
</Button>
)}


</div>

</div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onEdit(enquiry)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
}
