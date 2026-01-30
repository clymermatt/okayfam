// @ts-nocheck - Supabase types not generated
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/queries';
import { z } from 'zod';

const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: z.number().min(1, 'Target amount must be greater than 0'),
  target_date: z.string().min(1, 'Target date is required'),
});

export async function createSavingsGoal(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const rawData = {
    name: formData.get('name') as string,
    target_amount: parseInt(formData.get('target_amount') as string) || 0,
    target_date: formData.get('target_date') as string,
  };

  const result = savingsGoalSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase.from('savings_goals').insert({
    family_id: profile.family_id,
    name: result.data.name,
    target_amount: result.data.target_amount,
    target_date: result.data.target_date,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/budget');
  revalidatePath('/savings');
}

export async function updateSavingsGoal(goalId: string, formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    name: formData.get('name') as string,
    target_amount: parseInt(formData.get('target_amount') as string) || 0,
    target_date: formData.get('target_date') as string,
  };

  const result = savingsGoalSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase
    .from('savings_goals')
    .update({
      name: result.data.name,
      target_amount: result.data.target_amount,
      target_date: result.data.target_date,
    })
    .eq('id', goalId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/budget');
  revalidatePath('/savings');
}

export async function contributeSavings(goalId: string, amount: number) {
  const supabase = await createClient();

  // Get current goal
  const { data: goal } = await supabase
    .from('savings_goals')
    .select('current_amount, target_amount')
    .eq('id', goalId)
    .single();

  if (!goal) {
    return { error: 'Goal not found' };
  }

  const newAmount = goal.current_amount + amount;
  const isCompleted = newAmount >= goal.target_amount;

  const { error } = await supabase
    .from('savings_goals')
    .update({
      current_amount: newAmount,
      is_completed: isCompleted,
    })
    .eq('id', goalId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/budget');
  revalidatePath('/savings');
}

export async function deleteSavingsGoal(goalId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goalId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/budget');
  revalidatePath('/savings');
}
