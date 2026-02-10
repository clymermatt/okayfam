import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Please enter your name'),
});

// Time format: HH:mm (24-hour) or empty
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  event_date: z.string().min(1, 'Date is required'),
  event_time: z.string()
    .transform(val => val === '' ? undefined : val)
    .refine(val => val === undefined || timeRegex.test(val), {
      message: 'Please enter a valid time (HH:MM)',
    })
    .optional(),
  estimated_cost: z.number().min(0, 'Amount cannot be negative'),
  event_type: z.enum(['expense', 'income', 'calendar']).default('expense'),
  participant_ids: z.array(z.string()).optional(),
  recurrence: z.enum(['weekly', 'biweekly', 'monthly', 'yearly']).nullable().optional(),
  recurrence_end_date: z.string().optional(),
});

export const completeEventSchema = z.object({
  event_id: z.string().uuid(),
  actual_cost: z.number().min(0, 'Cost cannot be negative'),
});

export const checklistSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  event_id: z.string().uuid().optional().nullable(),
});

export const checklistItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  checklist_id: z.string().uuid(),
});

export const familyMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});

export const budgetSchema = z.object({
  monthly_budget: z.number().min(0, 'Budget cannot be negative'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type CompleteEventInput = z.infer<typeof completeEventSchema>;
export type ChecklistInput = z.infer<typeof checklistSchema>;
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
