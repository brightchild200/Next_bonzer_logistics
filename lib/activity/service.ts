import type {
  ActivityPayload,
  ActivityRecord,
  ActivityService,
} from './types';

export class ActivityServiceImpl implements ActivityService {
  async record(payload: ActivityPayload): Promise<ActivityRecord> {
    return {
      id: '',
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      actor: payload.actor,
      severity: payload.severity ?? 'info',
      metadata: payload.metadata,
      createdAt: new Date(0).toISOString(),
    };
  }

  async listByEntity(
    _entityType: string,
    _entityId: string
  ): Promise<ActivityRecord[]> {
    return [];
  }
}

export const activityService = new ActivityServiceImpl();
