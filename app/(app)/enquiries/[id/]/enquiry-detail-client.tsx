'use client';

import { useState } from 'react';
import { Package, Ship, Plane, Truck, Train, Calendar, MapPin, Building2, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { EnquiryWorkflowRecord } from '@/lib/actions/enquiries';

const modeIcons = {
  air: Plane,
  sea: Ship,
  road: Truck,
  rail: Train,
};

interface EnquiryDetailClientProps {
  enquiry: EnquiryWorkflowRecord;
  assignedCSName: string | null;
  initialActivities: Array<{
    id: string;
    action: string;
    description: string | null;
    owner_id: string;
    actor_name: string | null;
    actor_employee_code: string | null;
    created_at: string;
  }>;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getModeIcon(mode: string) {
  return modeIcons[mode as keyof typeof modeIcons] ?? Package;
}

export function EnquiryDetailClient({ enquiry, assignedCSName, initialActivities }: EnquiryDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');
  const [activities] = useState(initialActivities);

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'overview' | 'activity');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{enquiry.reference}</h1>
          <p className="text-sm text-muted-foreground">
            {enquiry.customer_name ?? 'No customer linked'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={enquiry.status} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Identification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Reference</label>
                  <p className="font-mono text-sm">{enquiry.reference}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <StatusBadge status={enquiry.status} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{formatDateTime(enquiry.created_at)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{formatDateTime(enquiry.updated_at)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <p className="text-sm font-medium">{enquiry.customer_name ?? '—'}</p>
                </div>
                {enquiry.customer_id && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Customer ID</label>
                    <p className="text-sm font-mono text-xs">{enquiry.customer_id}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Customer Service</label>
                  <p className="text-sm">{assignedCSName ?? '—'}</p>
                </div>
                {enquiry.assigned_at && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Assigned Date</label>
                    <p className="text-sm">{formatDateTime(enquiry.assigned_at)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Shipment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Origin</label>
                  <p className="text-sm">{enquiry.origin ?? '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Destination</label>
                  <p className="text-sm">{enquiry.destination ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Mode</label>
                  <Badge variant="secondary" className="gap-1">
                    {(() => {
                      const ModeIcon = getModeIcon(enquiry.mode);
                      return <ModeIcon className="h-3 w-3" />;
                    })()}
                    <span className="capitalize">{enquiry.mode}</span>
                  </Badge>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Expected Shipment Date</label>
                  <p className="text-sm">{formatDate(enquiry.expected_shipment_date)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Cargo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cargo Type</label>
                  <p className="text-sm">{enquiry.cargo_type ?? '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Weight (kg)</label>
                  <p className="text-sm">{enquiry.weight_kg?.toLocaleString() ?? '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Volume (CBM)</label>
                  <p className="text-sm">{enquiry.volume_cbm?.toLocaleString() ?? '—'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Commercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Incoterm</label>
                  <p className="text-sm">{enquiry.incoterm ?? '—'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {enquiry.notes ?? 'No notes'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{activity.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(activity.created_at)}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          By: {activity.actor_name ?? 'Unknown user'}
                          {activity.actor_employee_code && ` (${activity.actor_employee_code})`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}