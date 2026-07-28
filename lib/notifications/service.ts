import type {
  NotificationPayload,
  NotificationRecord,
  NotificationService,
  NotificationTarget,
} from './types';

export class NotificationServiceImpl implements NotificationService {
  async send(payload: NotificationPayload): Promise<NotificationRecord> {
    return {
      id: '',
      title: payload.title,
      message: payload.message,
      severity: payload.severity ?? 'info',
      channel: payload.channel ?? 'in_app',
      target: payload.target,
      metadata: payload.metadata,
      createdAt: new Date(0).toISOString(),
      readAt: null,
    };
  }

  async markAsRead(_notificationId: string): Promise<void> {}

  async listForTarget(_target: NotificationTarget): Promise<NotificationRecord[]> {
    return [];
  }
}

export const notificationService = new NotificationServiceImpl();
