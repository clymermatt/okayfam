// @ts-nocheck - Supabase types not generated
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checklistSchema, checklistItemSchema } from '@/lib/validations';
import { getProfile } from '@/lib/queries';

// ============ Checklist Actions ============

export async function createChecklist(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const name = formData.get('name') as string;
  const eventId = formData.get('event_id') as string | null;

  const result = checklistSchema.safeParse({
    name,
    event_id: eventId || null
  });

  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { data, error } = await supabase.from('checklists').insert({
    family_id: profile.family_id,
    name: result.data.name,
    event_id: result.data.event_id,
  }).select('id').single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/checklists');
  if (result.data.event_id) {
    revalidatePath(`/events/${result.data.event_id}`);
  }
  redirect(`/checklists/${data.id}`);
}

export async function updateChecklist(checklistId: string, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;

  if (!name || name.trim() === '') {
    return { error: 'Name is required' };
  }

  const { data: checklist } = await supabase
    .from('checklists')
    .select('event_id')
    .eq('id', checklistId)
    .single();

  const { error } = await supabase
    .from('checklists')
    .update({ name: name.trim() })
    .eq('id', checklistId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/checklists');
  revalidatePath(`/checklists/${checklistId}`);
  if (checklist?.event_id) {
    revalidatePath(`/events/${checklist.event_id}`);
  }
}

export async function deleteChecklist(checklistId: string) {
  const supabase = await createClient();

  const { data: checklist } = await supabase
    .from('checklists')
    .select('event_id')
    .eq('id', checklistId)
    .single();

  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('id', checklistId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/checklists');
  if (checklist?.event_id) {
    revalidatePath(`/events/${checklist.event_id}`);
  }
  redirect('/checklists');
}

export async function linkChecklistToEvent(checklistId: string, eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('checklists')
    .update({ event_id: eventId })
    .eq('id', checklistId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/checklists');
  revalidatePath(`/checklists/${checklistId}`);
  revalidatePath(`/events/${eventId}`);
}

export async function unlinkChecklistFromEvent(checklistId: string) {
  const supabase = await createClient();

  const { data: checklist } = await supabase
    .from('checklists')
    .select('event_id')
    .eq('id', checklistId)
    .single();

  const { error } = await supabase
    .from('checklists')
    .update({ event_id: null })
    .eq('id', checklistId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/checklists');
  revalidatePath(`/checklists/${checklistId}`);
  if (checklist?.event_id) {
    revalidatePath(`/events/${checklist.event_id}`);
  }
}

export async function toggleChecklistComplete(checklistId: string, isCompleted: boolean) {
  const supabase = await createClient();

  const { data: checklist } = await supabase
    .from('checklists')
    .select('event_id')
    .eq('id', checklistId)
    .single();

  const { error } = await supabase
    .from('checklists')
    .update({ is_completed: isCompleted })
    .eq('id', checklistId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/checklists');
  revalidatePath(`/checklists/${checklistId}`);
  if (checklist?.event_id) {
    revalidatePath(`/events/${checklist.event_id}`);
  }
}

// ============ Checklist Item Actions ============

export async function addChecklistItem(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const checklistId = formData.get('checklist_id') as string;
  const title = formData.get('title') as string;

  const result = checklistItemSchema.safeParse({ title, checklist_id: checklistId });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  // Get checklist to find event_id for revalidation
  const { data: checklist } = await supabase
    .from('checklists')
    .select('event_id')
    .eq('id', checklistId)
    .single();

  // Get current max sort order
  const { data: existing } = await supabase
    .from('checklist_items')
    .select('sort_order')
    .eq('checklist_id', checklistId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from('checklist_items').insert({
    checklist_id: checklistId,
    family_id: profile.family_id,
    title: result.data.title,
    sort_order: nextOrder,
  });

  if (error) {
    return { error: error.message };
  }

  // Adding an item means the checklist is no longer complete
  await supabase
    .from('checklists')
    .update({ is_completed: false })
    .eq('id', checklistId);

  revalidatePath(`/checklists/${checklistId}`);
  if (checklist?.event_id) {
    revalidatePath(`/events/${checklist.event_id}`);
  }
}

export async function toggleChecklistItem(itemId: string, isCompleted: boolean) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('checklist_items')
    .select('checklist_id')
    .eq('id', itemId)
    .single();

  if (!item) {
    return { error: 'Item not found' };
  }

  const { error } = await supabase
    .from('checklist_items')
    .update({ is_completed: isCompleted })
    .eq('id', itemId);

  if (error) {
    return { error: error.message };
  }

  // Get checklist info for revalidation and auto-completion logic
  const { data: checklist } = await supabase
    .from('checklists')
    .select('event_id, is_completed')
    .eq('id', item.checklist_id)
    .single();

  // Check if all items are now completed (for standalone checklists)
  if (isCompleted && checklist && !checklist.event_id) {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('is_completed')
      .eq('checklist_id', item.checklist_id);

    const allCompleted = items?.every(i => i.is_completed);

    if (allCompleted) {
      await supabase
        .from('checklists')
        .update({ is_completed: true })
        .eq('id', item.checklist_id);
    }
  }

  // If unchecking, ensure checklist is not marked complete
  if (!isCompleted && checklist?.is_completed) {
    await supabase
      .from('checklists')
      .update({ is_completed: false })
      .eq('id', item.checklist_id);
  }

  revalidatePath(`/checklists/${item.checklist_id}`);
  if (checklist?.event_id) {
    revalidatePath(`/events/${checklist.event_id}`);
  }
}

export async function deleteChecklistItem(itemId: string) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('checklist_items')
    .select('checklist_id')
    .eq('id', itemId)
    .single();

  if (!item) {
    return { error: 'Item not found' };
  }

  // Get checklist info for revalidation
  const { data: checklist } = await supabase
    .from('checklists')
    .select('event_id')
    .eq('id', item.checklist_id)
    .single();

  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/checklists/${item.checklist_id}`);
  if (checklist?.event_id) {
    revalidatePath(`/events/${checklist.event_id}`);
  }
}
