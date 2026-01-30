// @ts-nocheck - Supabase types not generated
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getProfile } from '@/lib/queries';
import { autoMatchTransactions } from '@/lib/auto-match';

export async function disconnectBank(connectionId: string) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  // Delete the connection (cascades to accounts and transactions)
  const { error } = await supabase
    .from('bank_connections')
    .delete()
    .eq('id', connectionId)
    .eq('family_id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/transactions');
}

export async function toggleAccountTracking(accountId: string, isTracked: boolean) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const { error } = await supabase
    .from('bank_accounts')
    .update({ is_tracked: isTracked })
    .eq('id', accountId)
    .eq('family_id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/settings');
  revalidatePath('/transactions');
}

export async function linkTransactionToEvent(transactionId: string, eventId: string | null) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const { error } = await supabase
    .from('bank_transactions')
    .update({ linked_event_id: eventId })
    .eq('id', transactionId)
    .eq('family_id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  // If linking to an event, also update the event's actual_cost
  if (eventId) {
    const { data: transaction } = await supabase
      .from('bank_transactions')
      .select('amount')
      .eq('id', transactionId)
      .single();

    if (transaction) {
      await supabase
        .from('events')
        .update({ actual_cost: transaction.amount })
        .eq('id', eventId)
        .eq('family_id', profile.family_id);
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/events');
  revalidatePath('/budget');
  revalidatePath('/');
}

export async function hideTransaction(transactionId: string) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const { error } = await supabase
    .from('bank_transactions')
    .update({ is_hidden: true })
    .eq('id', transactionId)
    .eq('family_id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/transactions');
}

export async function unhideTransaction(transactionId: string) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const { error } = await supabase
    .from('bank_transactions')
    .update({ is_hidden: false })
    .eq('id', transactionId)
    .eq('family_id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/transactions');
}

export async function setTransactionCategory(transactionId: string, categoryId: string | null) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  // If setting a category, verify it exists and belongs to user's family
  if (categoryId) {
    const { data: category } = await supabase
      .from('merchant_categories')
      .select('id, category_type, event_id')
      .eq('id', categoryId)
      .eq('family_id', profile.family_id)
      .single();

    if (!category) {
      return { error: 'Category not found' };
    }

    // If it's an event-type category, also link to the event
    const updateData: { category_id: string; linked_event_id?: string } = {
      category_id: categoryId,
    };

    if (category.category_type === 'event' && category.event_id) {
      updateData.linked_event_id = category.event_id;
    }

    const { error } = await supabase
      .from('bank_transactions')
      .update(updateData)
      .eq('id', transactionId)
      .eq('family_id', profile.family_id);

    if (error) {
      return { error: error.message };
    }
  } else {
    // Clearing the category
    const { error } = await supabase
      .from('bank_transactions')
      .update({ category_id: null, linked_event_id: null })
      .eq('id', transactionId)
      .eq('family_id', profile.family_id);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/budget');
}

export async function createEventFromTransaction(transactionId: string) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  // Get the transaction
  const { data: transaction, error: txError } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('family_id', profile.family_id)
    .single();

  if (txError || !transaction) {
    return { error: 'Transaction not found' };
  }

  // Create an event from the transaction
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      family_id: profile.family_id,
      title: transaction.merchant_name || transaction.name,
      event_date: transaction.date,
      estimated_cost: transaction.amount,
      actual_cost: transaction.amount,
      event_type: transaction.amount > 0 ? 'expense' : 'income',
      status: 'completed',
      created_by: profile.id,
    })
    .select()
    .single();

  if (eventError || !event) {
    return { error: eventError?.message || 'Failed to create event' };
  }

  // Link the transaction to the new event
  await supabase
    .from('bank_transactions')
    .update({ linked_event_id: event.id })
    .eq('id', transactionId);

  revalidatePath('/transactions');
  revalidatePath('/events');
  revalidatePath('/budget');
  revalidatePath('/');

  return { eventId: event.id };
}

export async function createMerchantRule(keyword: string, eventId: string) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const { error } = await supabase
    .from('merchant_rules')
    .insert({
      family_id: profile.family_id,
      keyword: keyword.toLowerCase().trim(),
      event_id: eventId,
    });

  if (error) {
    if (error.code === '23505') {
      return { error: 'A rule with this keyword already exists' };
    }
    return { error: error.message };
  }

  // Run auto-match to apply the new rule immediately
  await autoMatchTransactions(supabase, profile.family_id);

  revalidatePath('/transactions');
  revalidatePath('/settings');
  revalidatePath('/events');
}

export async function deleteMerchantRule(ruleId: string) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const { error } = await supabase
    .from('merchant_rules')
    .delete()
    .eq('id', ruleId)
    .eq('family_id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/transactions');
  revalidatePath('/settings');
}

// Merchant Category actions (new category-based system)

export async function createMerchantCategory(
  name: string,
  keywords: string[],
  categoryType: 'budget' | 'event',
  monthlyBudget: number | null,
  eventId: string | null
) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  // Normalize keywords (lowercase, trim, remove empty)
  const normalizedKeywords = keywords
    .map(k => k.toLowerCase().trim())
    .filter(k => k.length > 0);

  if (normalizedKeywords.length === 0) {
    return { error: 'At least one keyword is required' };
  }

  // Validate based on category type
  if (categoryType === 'budget' && !monthlyBudget) {
    return { error: 'Monthly budget is required for budget-type categories' };
  }
  if (categoryType === 'event' && !eventId) {
    return { error: 'Event is required for event-type categories' };
  }

  const { error } = await supabase
    .from('merchant_categories')
    .insert({
      family_id: profile.family_id,
      name: name.trim(),
      keywords: normalizedKeywords,
      category_type: categoryType,
      monthly_budget: categoryType === 'budget' ? monthlyBudget : null,
      event_id: categoryType === 'event' ? eventId : null,
    });

  if (error) {
    if (error.code === '23505') {
      return { error: 'A category with this name already exists' };
    }
    return { error: error.message };
  }

  // Run auto-match to apply the new category immediately
  await autoMatchTransactions(supabase, profile.family_id);

  revalidatePath('/transactions');
  revalidatePath('/settings');
  revalidatePath('/events');
  revalidatePath('/budget');
}

export async function updateMerchantCategory(
  categoryId: string,
  name: string,
  keywords: string[],
  categoryType: 'budget' | 'event',
  monthlyBudget: number | null,
  eventId: string | null
) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  // Normalize keywords
  const normalizedKeywords = keywords
    .map(k => k.toLowerCase().trim())
    .filter(k => k.length > 0);

  if (normalizedKeywords.length === 0) {
    return { error: 'At least one keyword is required' };
  }

  // Validate based on category type
  if (categoryType === 'budget' && !monthlyBudget) {
    return { error: 'Monthly budget is required for budget-type categories' };
  }
  if (categoryType === 'event' && !eventId) {
    return { error: 'Event is required for event-type categories' };
  }

  const { error } = await supabase
    .from('merchant_categories')
    .update({
      name: name.trim(),
      keywords: normalizedKeywords,
      category_type: categoryType,
      monthly_budget: categoryType === 'budget' ? monthlyBudget : null,
      event_id: categoryType === 'event' ? eventId : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)
    .eq('family_id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  // Run auto-match to apply changes
  await autoMatchTransactions(supabase, profile.family_id);

  revalidatePath('/transactions');
  revalidatePath('/settings');
  revalidatePath('/events');
  revalidatePath('/budget');
}

export async function deleteMerchantCategory(categoryId: string) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const { error } = await supabase
    .from('merchant_categories')
    .delete()
    .eq('id', categoryId)
    .eq('family_id', profile.family_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/transactions');
  revalidatePath('/settings');
}

export async function runAutoMatch() {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const result = await autoMatchTransactions(supabase, profile.family_id);

  revalidatePath('/transactions');
  revalidatePath('/events');
  revalidatePath('/budget');
  revalidatePath('/');

  return { matched: result.matched, details: result.details };
}

