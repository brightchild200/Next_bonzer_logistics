import type { NotificationPayload, NotificationTarget } from './types';

export function normalizeNotificationPayload(
  payload: NotificationPayload
): NotificationPayload {
  return payload;
}

export function serializeNotificationTarget(
  target?: NotificationTarget
): string {
  return JSON.stringify(target ?? {});
}
