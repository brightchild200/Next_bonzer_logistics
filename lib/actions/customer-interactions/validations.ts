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
  customerId: z.string().uuid('Customer ID must be a valid UUID'),
  employeeId: z.string().uuid('Employee ID must be a valid UUID'),
  interactionTypeId: z.string().uuid('Interaction type ID must be a valid UUID'),
  interactionOutcomeId: z.string().uuid('Interaction outcome ID must be a valid UUID'),
  subject: z.string().max(255, 'Subject too long').nullable(),
  notes: z.string().min(1, 'Notes are required').max(10000, 'Notes too long'),
  interactionAt: z.string().datetime('Invalid interaction date/time format'),
  contactPersonName: z.string().min(1, 'Contact person name is required').max(255),
  contactPersonMobile: z.string().min(1, 'Contact person mobile is required').max(50),
  contactPersonEmail: z.string().email('Invalid email format').max(255).nullable().optional(),
  contactPersonDesignation: z.string().max(255).nullable().optional(),
  interactionChannel: interactionChannelSchema,
  interactionDurationMinutes: z.number().int().min(0, 'Duration must be >= 0').nullable().optional(),
}) satisfies z.ZodType<CreateInteractionInput>;

export const updateInteractionSchema = z.object({
  interactionId: z.string().uuid('Interaction ID must be a valid UUID'),
  interactionOutcomeId: z.string().uuid('Invalid outcome ID').optional(),
  subject: z.string().max(255, 'Subject too long').nullable().optional(),
  notes: z.string().min(1, 'Notes cannot be empty').max(10000, 'Notes too long').optional(),
  interactionAt: z.string().datetime('Invalid date/time format').optional(),
  isActive: z.boolean().optional(),
  contactPersonName: z.string().min(1).max(255).optional(),
  contactPersonMobile: z.string().min(1).max(50).optional(),
  contactPersonEmail: z.string().email('Invalid email format').max(255).nullable().optional(),
  contactPersonDesignation: z.string().max(255).nullable().optional(),
  interactionChannel: interactionChannelSchema.optional(),
  interactionDurationMinutes: z.number().int().min(0, 'Duration must be >= 0').nullable().optional(),
}) as z.ZodType<UpdateInteractionInput>;

export const createFollowupSchema = z.object({
  interactionId: z.string().uuid('Interaction ID must be a valid UUID'),
  dueAt: z.string().datetime('Invalid due date/time format'),
  status: z.enum(['Pending', 'Completed']).optional(),
}) as z.ZodType<CreateFollowupInput>;

export const completeFollowupSchema = z.object({
  followupId: z.string().uuid('Followup ID must be a valid UUID'),
  completionNotes: z.string().min(1, 'Completion notes are required').max(10000, 'Notes too long'),
  completedAt: z.string().datetime('Invalid completion date/time format').optional(),
}) as z.ZodType<CompleteFollowupInput>;

export const interactionFiltersSchema = z.object({
  customerId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  interactionTypeId: z.string().uuid().optional(),
  interactionOutcomeId: z.string().uuid().optional(),
  enquiryId: z.string().uuid().nullable().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  search: z.string().max(255).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
}) as z.ZodType<InteractionFilters>;

export const followupFiltersSchema = z.object({
  interactionId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.enum(['Pending', 'Completed']).optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  createdBy: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
}) as z.ZodType<FollowupFilters>;

export function validateCreateInteraction(input: unknown) {
  return createInteractionSchema.safeParse(input);
}

export function validateUpdateInteraction(input: unknown) {
  return updateInteractionSchema.safeParse(input);
}

export function validateCreateFollowup(input: unknown) {
  return createFollowupSchema.safeParse(input);
}

export function validateCompleteFollowup(input: unknown) {
  return completeFollowupSchema.safeParse(input);
}

export function validateInteractionFilters(input: unknown) {
  return interactionFiltersSchema.safeParse(input);
}

export function validateFollowupFilters(input: unknown) {
  return followupFiltersSchema.safeParse(input);
}