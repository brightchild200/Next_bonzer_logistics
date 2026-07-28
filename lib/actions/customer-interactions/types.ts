export type InteractionTypeCode =
  | 'PHONE_CALL'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'MEETING'
  | 'VIDEO_CALL'
  | 'WALK_IN'
  | 'OTHER';

export type InteractionOutcomeCode =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CALL_BACK_LATER'
  | 'QUOTATION_REQUESTED'
  | 'MEETING_SCHEDULED'
  | 'NO_RESPONSE'
  | 'WRONG_CONTACT'
  | 'CONVERTED_TO_ENQUIRY';

export type FollowupStatus = 'Pending' | 'Completed';

export interface InteractionType {
  id: string;
  code: InteractionTypeCode;
  name: string;
  description: string | null;
  displayOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionOutcome {
  id: string;
  code: InteractionOutcomeCode;
  name: string;
  description: string | null;
  displayOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInteractionInput {
  customerId: string;
  employeeId: string;
  interactionTypeId: string;
  interactionOutcomeId: string;
  subject: string | null;
  notes: string;
  interactionAt: string;
}

export interface UpdateInteractionInput {
  interactionId: string;
  interactionOutcomeId?: string;
  subject?: string | null;
  notes?: string;
  interactionAt?: string;
  isActive?: boolean;
}

export interface CreateFollowupInput {
  interactionId: string;
  dueAt: string;
  status?: FollowupStatus;
}

export interface CompleteFollowupInput {
  followupId: string;
  completionNotes: string;
  completedAt?: string;
}

export interface InteractionFilters {
  customerId?: string;
  employeeId?: string;
  interactionTypeId?: string;
  interactionOutcomeId?: string;
  enquiryId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FollowupFilters {
  interactionId?: string;
  status?: FollowupStatus;
  dueFrom?: string;
  dueTo?: string;
  createdBy?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface InteractionSummary {
  totalInteractions: number;
  openFollowups: number;
  completedFollowups: number;
  latestInteractionAt: string | null;
  latestOutcome: string | null;
}

export interface CustomerSearchResult {
  customerId: string;
  customerRef: string;
  companyName: string;
  city: string | null;
  state: string | null;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
}

export interface CustomerInteraction {
  id: string;
  interactionRef: string;
  customerId: string;
  customerRef: string;
  companyName: string;
  enquiryId: string | null;
  employeeId: string;
  interactionTypeId: string;
  interactionOutcomeId: string;
  subject: string | null;
  notes: string;
  interactionAt: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface InteractionFollowup {
  id: string;
  followupRef: string;
  interactionId: string;
  dueAt: string;
  status: FollowupStatus;
  completionNotes: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}