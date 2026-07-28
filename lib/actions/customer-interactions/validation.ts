import { z } from 'zod';
import type {
  InteractionChannel,
  CreateInteractionInput,
  UpdateInteractionInput,
  CreateFollowupInput,
  CompleteFollowupInput,
  InteractionFilters,
  FollowupFilters,
} from './types';

export const interactionChannelSchema = z.enum([
  'CALL',
  'VISIT',
  'WHATSAPP',
  'EMAIL',
  'MEETING',
  'VIDEO_CALL',
]) satisfies z.ZodEnum<[InteractionChannel, ...InteractionChannel[]]>;

export const createInteractionSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  employeeId: z.string().uuid('Invalid employee ID'),
  interactionTypeId: z.string().uuid('Invalid interaction type ID'),
  interactionOutcomeId: z.string().uuid('Invalid interaction outcome ID'),
  subject: z.string().max(255, 'Subject too long').nullable().optional(),
  notes: z.string().min(1, 'Notes are required').max(10000, 'Notes too long'),
  interactionAt: z.string().datetime('Invalid interaction date/time'),
  contactPersonName: z.string().min(1, 'Contact person name is required').max(255, 'Name too long'),
  contactPersonMobile: z.string().min(1, 'Contact person mobile is required').max(50, 'Mobile too long'),
  contactPersonEmail: z.string().email('Invalid email format').max(255, 'Email too long').nullable().optional(),
  contactPersonDesignation: z.string().max(100, 'Designation too long').nullable().optional(),
  interactionChannel: interactionChannelSchema,
  interactionDurationMinutes: z.number().int().min(0, 'Duration must be >= 0').nullable().optional(),
}) satisfies z.ZodType<CreateInteractionInput>;

export const updateInteractionSchema = z.object({
  interactionId: z.string().uuid('Invalid interaction ID'),
  interactionOutcomeId: z.string().uuid('Invalid interaction outcome ID').optional(),
  subject: z.string().max(255, 'Subject too long').nullable().optional(),
  notes: z.string().min(1, 'Notes cannot be empty').max(10000, 'Notes too long').optional(),
  interactionAt: z.string().datetime('Invalid interaction date/time').optional(),
  isActive: z.boolean().optional(),
  contactPersonName: z.string().min(1, 'Contact person name is required').max(255, 'Name too long').optional(),
  contactPersonMobile: z.string().min(1, 'Contact person mobile is required').max(50, 'Mobile too long').optional(),
  contactPersonEmail: z.string().email('Invalid email format').max(255, 'Email too long').nullable().optional(),
  contactPersonDesignation: z.string().max(100, 'Designation too long').nullable().optional(),
  interactionChannel: interactionChannelSchema.optional(),
  interactionDurationMinutes: z.number().int().min(0, 'Duration must be >= 0').nullable().optional(),
}) satisfies z.ZodType<UpdateInteractionInput>;

export const createFollowupSchema = z.object({
  interactionId: z.string().uuid('Invalid interaction ID'),
  dueAt: z.string().datetime('Invalid due date/time'),
  status: z.enum(['Pending', 'Completed']).optional(),
}) satisfies z.ZodType<CreateFollowupInput>;

export const completeFollowupSchema = z.object({
  followupId: z.string().uuid('Invalid followup ID'),
  completionNotes: z.string().min(1, 'Completion notes are required').max(10000, 'Notes too long'),
  completedAt: z.string().datetime('Invalid completion date/time').optional(),
}) satisfies z.ZodType<CompleteFollowupInput>;

export const interactionFiltersSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional(),
  employeeId: z.string().uuid('Invalid employee ID').optional(),
  interactionTypeId: z.string().uuid('Invalid interaction type ID').optional(),
  interactionOutcomeId: z.string().uuid('Invalid interaction outcome ID').optional(),
  enquiryId: z.string().uuid().nullable().optional(),
  dateFrom: z.string().datetime('Invalid date from').optional(),
  dateTo: z.string().datetime('Invalid date to').optional(),
  isActive: z.boolean().optional(),
  search: z.string().max(255, 'Search term too long').optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
}) satisfies z.ZodType<InteractionFilters>;

export const followupFiltersSchema = z.object({
  interactionId: z.string().uuid('Invalid interaction ID').optional(),
  status: z.enum(['Pending', 'Completed']).optional(),
  dueFrom: z.string().datetime('Invalid due from').optional(),
  dueTo: z.string().datetime('Invalid due to').optional(),
  createdBy: z.string().uuid('Invalid created by ID').optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
}) satisfies z.ZodType<FollowupFilters>;

export type CreateInteractionValidated = z.infer<typeof createInteractionSchema>;
export type UpdateInteractionValidated = z.infer<typeof updateInteractionSchema>;
export type CreateFollowupValidated = z.infer<typeof createFollowupSchema>;
export type CompleteFollowupValidated = z.infer<typeof completeFollowupSchema>;
export type InteractionFiltersValidated = z.infer<typeof interactionFiltersSchema>;
export type FollowupFiltersValidated = z.infer<typeof followupFiltersSchema>;