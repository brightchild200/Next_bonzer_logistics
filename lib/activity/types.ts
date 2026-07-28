export type ActivitySeverity = 'info' | 'success' | 'warning' | 'error';

export type ActivityActorType = 'user' | 'system' | 'service';

export interface ActivityActor {
  id?: string;
  type: ActivityActorType;
  name?: string;
}

export interface ActivityPayload {
  entityType: string;
  entityId: string;
  action: string;
  actor?: ActivityActor;
  severity?: ActivitySeverity;
  metadata?: Record<string, unknown>;
}

export interface ActivityRecord extends ActivityPayload {
  id: string;
  createdAt: string;
}

export interface ActivityService {
  record(payload: ActivityPayload): Promise<ActivityRecord>;
  listByEntity(entityType: string, entityId: string): Promise<ActivityRecord[]>;
}
