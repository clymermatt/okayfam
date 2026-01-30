// @ts-nocheck - Supabase types not generated
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { budgetSchema, familyMemberSchema } from '@/lib/validations';
import { getProfile } from '@/lib/queries';

export async function updateBudget(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const monthly_budget = parseInt(formData.get('monthly_budget') as string) || 0;

  const result = budgetSchema.safeParse({ monthly_budget });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase
    .from('families')
    .update({ monthly_budget: result.data.monthly_budget })
    .eq('id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/budget');
  revalidatePath('/settings');
}

export async function updateFamilyName(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const name = formData.get('name') as string;

  if (!name || name.trim().length === 0) {
    return { error: 'Name is required' };
  }

  const { error } = await supabase
    .from('families')
    .update({ name: name.trim() })
    .eq('id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
}

export async function addFamilyMember(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const rawData = {
    name: formData.get('name') as string,
    color: formData.get('color') as string || '#3B82F6',
  };

  const result = familyMemberSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase.from('family_members').insert({
    family_id: profile.family_id,
    name: result.data.name,
    color: result.data.color,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/events');
}

export async function updateFamilyMember(memberId: string, formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    name: formData.get('name') as string,
    color: formData.get('color') as string,
  };

  const result = familyMemberSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase
    .from('family_members')
    .update({
      name: result.data.name,
      color: result.data.color,
    })
    .eq('id', memberId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/events');
}

export async function deleteFamilyMember(memberId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/events');
}
