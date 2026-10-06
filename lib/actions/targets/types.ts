export type TargetMetric = 'CUSTOMER_INTERACTIONS' | 'ENQUIRIES' | 'JOBS';

export interface SalesTarget {
  id: string;
  salesperson_id: string;
  metric: TargetMetric;
  target_value: number;
  period_start: string;
  period_end: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTargetInput {
  salesperson_id: string;
  metric: TargetMetric;
  target_value: number;
  period_start: string;
  period_end: string;
}

export interface UpdateTargetInput {
  target_id: string;
  metric?: TargetMetric;
  target_value?: number;
  period_start?: string;
  period_end?: string;
}

export type CreateTargetResult =
  | { success: true; target: SalesTarget }
  | { success: false; error: string };

export type UpdateTargetResult =
  | { success: true; target: SalesTarget }
  | { success: false; error: string };

export type GetTargetResult =
  | { success: true; target: SalesTarget | null }
  | { success: false; error: string };

export interface ListTargetsParams {
  page?: number;
  pageSize?: number;
  salespersonId?: string;
  metric?: TargetMetric;
  periodStart?: string;
  periodEnd?: string;
}

export type ListTargetsResult =
  | { success: true; targets: SalesTarget[]; totalCount: number }
  | { success: false; error: string };

export interface TargetProgress {
  customer_interactions: number;
  enquiries: number;
  jobs: number;
}

export interface TargetWithProgress extends SalesTarget {
  progress: TargetProgress;
  achievement_percentage: number;
}

export interface ListTargetsWithProgressParams extends ListTargetsParams {}

export type ListTargetsWithProgressResult =
  | { success: true; targets: TargetWithProgress[]; totalCount: number }
  | { success: false; error: string };
