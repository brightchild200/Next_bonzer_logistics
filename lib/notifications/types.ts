export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

export interface NotificationTarget {
  userId?: string;
  role?: string;
  teamId?: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  severity?: NotificationSeverity;
  channel?: NotificationChannel;
  target?: NotificationTarget;
  metadata?: Record<string, unknown>;
}

export interface NotificationRecord extends NotificationPayload {
  id: string;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationService {
  send(payload: NotificationPayload): Promise<NotificationRecord>;
  markAsRead(notificationId: string): Promise<void>;
  listForTarget(target: NotificationTarget): Promise<NotificationRecord[]>;
}
