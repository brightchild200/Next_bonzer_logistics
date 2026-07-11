'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  Target,
  Smile,
  Users,
  Plus,
  Download,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle2,
  Info,
  Activity,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { KpiCard, type KpiData } from '@/components/kpi-card';
import {
  RevenueTrendChart,
  ShipmentTrendChart,
  ModeSplitChart,
  ImportExportChart,
  CustomerGrowthChart,
} from '@/components/charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import type { ActivityLog } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const kpis: KpiData[] = [
  {
    label: 'Total Enquiries',
    value: '1,284',
    change: 12.5,
    icon: FileText,
    accent: 'primary',
    sparkline: [20, 35, 28, 42, 38, 55, 48, 62],
  },
  {
    label: 'Active Shipments',
    value: '342',
    change: 8.2,
    icon: Package,
    accent: 'info',
    sparkline: [30, 25, 40, 35, 50, 45, 55, 60],
  },
  {
    label: 'Revenue',
    value: '$2.4M',
    change: 15.3,
    icon: DollarSign,
    accent: 'success',
    sparkline: [40, 45, 42, 55, 60, 58, 70, 75],
  },
  {
    label: 'Profit',
    value: '$680K',
    change: 9.1,
    icon: TrendingUp,
    accent: 'success',
    sparkline: [25, 30, 28, 35, 40, 38, 45, 50],
  },
  {
    label: 'Pending Payments',
    value: '$420K',
    change: -3.2,
    icon: Clock,
    accent: 'warning',
    sparkline: [50, 45, 48, 42, 40, 38, 35, 32],
  },
  {
    label: 'On-Time Delivery',
    value: '94.2%',
    change: 2.1,
    icon: Target,
    accent: 'primary',
    sparkline: [80, 82, 85, 88, 90, 91, 93, 94],
  },
  {
    label: 'Customer Satisfaction',
    value: '4.8/5',
    change: 5.4,
    icon: Smile,
    accent: 'info',
    sparkline: [70, 75, 78, 80, 82, 85, 88, 90],
  },
  {
    label: 'New Customers',
    value: '86',
    change: 18.7,
    icon: Users,
    accent: 'primary',
    sparkline: [10, 15, 20, 25, 30, 35, 40, 45],
  },
];

const revenueData = [
  { month: 'Jan', revenue: 145000, profit: 38000 },
  { month: 'Feb', revenue: 168000, profit: 42000 },
  { month: 'Mar', revenue: 192000, profit: 51000 },
  { month: 'Apr', revenue: 178000, profit: 48000 },
  { month: 'May', revenue: 215000, profit: 58000 },
  { month: 'Jun', revenue: 248000, profit: 67000 },
  { month: 'Jul', revenue: 285000, profit: 78000 },
  { month: 'Aug', revenue: 268000, profit: 72000 },
];

const shipmentData = [
  { month: 'Jan', shipments: 42 },
  { month: 'Feb', shipments: 55 },
  { month: 'Mar', shipments: 48 },
  { month: 'Apr', shipments: 62 },
  { month: 'May', shipments: 58 },
  { month: 'Jun', shipments: 71 },
  { month: 'Jul', shipments: 68 },
  { month: 'Aug', shipments: 82 },
];

const modeData = [
  { name: 'Sea', value: 45 },
  { name: 'Air', value: 30 },
  { name: 'Road', value: 18 },
  { name: 'Rail', value: 7 },
];

const importExportData = [
  { month: 'Mar', import: 120, export: 95 },
  { month: 'Apr', import: 135, export: 110 },
  { month: 'May', import: 148, export: 125 },
  { month: 'Jun', import: 162, export: 138 },
  { month: 'Jul', import: 155, export: 142 },
];

const customerGrowthData = [
  { month: 'Jan', customers: 120 },
  { month: 'Feb', customers: 145 },
  { month: 'Mar', customers: 168 },
  { month: 'Apr', customers: 195 },
  { month: 'May', customers: 220 },
  { month: 'Jun', customers: 248 },
  { month: 'Jul', customers: 285 },
];

const alerts = [
  {
    type: 'warning',
    title: 'Shipment SHP-1042 delayed',
    desc: 'Customs clearance pending at Rotterdam',
    time: '5 min ago',
  },
  {
    type: 'error',
    title: 'Invoice INV-2089 overdue',
    desc: 'Payment 14 days past due date',
    time: '1 hour ago',
  },
  {
    type: 'success',
    title: 'Shipment SHP-1038 delivered',
    desc: 'Delivered ahead of schedule in Singapore',
    time: '2 hours ago',
  },
  {
    type: 'info',
    title: 'New enquiry received',
    desc: 'Maersk Logistics — 3 containers to Hamburg',
    time: '3 hours ago',
  },
];

const aiInsights = [
  {
    title: 'Revenue forecast',
    desc: 'Based on current trends, Q3 revenue is projected to exceed $900K — a 22% increase over Q2.',
    tag: 'Forecast',
  },
  {
    title: 'Route optimization',
    desc: 'Switching 12 shipments from Shanghai→Rotterdam to the Suez route could save $48K in fuel costs.',
    tag: 'Savings',
  },
  {
    title: 'Anomaly detected',
    desc: 'Air freight costs for the APAC lane spiked 31% this week. Consider renegotiating carrier contracts.',
    tag: 'Alert',
  },
];

const quickActions = [
  { label: 'New Enquiry', icon: FileText, href: '/enquiries?new=true' },
  { label: 'New Shipment', icon: Package, href: '/shipments?new=true' },
  { label: 'New Invoice', icon: DollarSign, href: '/invoices?new=true' },
  { label: 'Add Customer', icon: Users, href: '/customers?new=true' },
];

const alertStyles = {
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  error: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  success: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  info: { icon: Info, color: 'text-info', bg: 'bg-info/10' },
};

export default function DashboardPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setActivities(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your logistics operations."
      >
        <div className="hidden items-center gap-2 md:flex">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search…" className="h-9 w-48 pl-9" />
          </div>
          <Select defaultValue="30d">
            <SelectTrigger className="h-9 w-[130px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="h-9 w-[120px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              <SelectItem value="ny">New York</SelectItem>
              <SelectItem value="rot">Rotterdam</SelectItem>
              <SelectItem value="sin">Singapore</SelectItem>
              <SelectItem value="dxb">Dubai</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" /> Export
        </Button>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New
        </Button>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.label} data={kpi} index={i} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">Revenue & Profit Trend</h3>
              <p className="text-xs text-muted-foreground">Monthly performance over 8 months</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3 text-success" /> +15.3%
            </Badge>
          </div>
          <RevenueTrendChart data={revenueData} />
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Shipment Mode Split</h3>
            <p className="text-xs text-muted-foreground">Air vs Sea vs Road vs Rail</p>
          </div>
          <ModeSplitChart data={modeData} />
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Shipment Volume</h3>
            <p className="text-xs text-muted-foreground">Monthly shipments</p>
          </div>
          <ShipmentTrendChart data={shipmentData} />
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Import vs Export</h3>
            <p className="text-xs text-muted-foreground">By volume (TEU)</p>
          </div>
          <ImportExportChart data={importExportData} />
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold">Customer Growth</h3>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </div>
          <CustomerGrowthChart data={customerGrowthData} />
        </Card>
      </div>

      {/* Widgets row */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Recent Activity</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <ScrollArea className="h-[280px] pr-2">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex h-[240px] flex-col items-center justify-center text-center">
                <Activity className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground/60">
                  Actions across your workspace will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">{a.action}</p>
                      {a.description && (
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Real-time Alerts */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Real-time Alerts</h3>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
              Live
            </span>
          </div>
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-2">
              {alerts.map((alert, i) => {
                const style = alertStyles[alert.type as keyof typeof alertStyles];
                const Icon = style.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        style.bg
                      )}
                    >
                      <Icon className={cn('h-4 w-4', style.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.desc}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">{alert.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* AI Insights */}
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> AI Insights
              </h3>
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
              </Badge>
            </div>
            <div className="space-y-3">
              {aiInsights.map((insight, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {insight.tag}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{insight.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions + Operational Status */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 font-display text-base font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.href}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-border p-4 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </a>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Operational Status</h3>
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> All systems operational
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'In Transit', value: 142, color: 'text-primary', bar: 'bg-primary' },
              { label: 'At Customs', value: 38, color: 'text-warning', bar: 'bg-warning' },
              { label: 'Delivered', value: 286, color: 'text-success', bar: 'bg-success' },
              { label: 'On Hold', value: 12, color: 'text-destructive', bar: 'bg-destructive' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn('mt-1 font-display text-xl font-bold', s.color)}>{s.value}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full', s.bar)}
                    style={{ width: `${(s.value / 286) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {['#2563eb', '#16a34a', '#f59e0b', '#dc2626'].map((c, i) => (
                  <Avatar key={i} className="h-7 w-7 border-2 border-background">
                    <AvatarFallback style={{ backgroundColor: c }} className="text-[10px] text-white">
                      {['JD', 'SM', 'AK', 'RP'][i]}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium">Team Activity</p>
                <p className="text-xs text-muted-foreground">12 members online now</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              View team <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
