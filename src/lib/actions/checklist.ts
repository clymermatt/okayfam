// @ts-nocheck - Supabase types not generated
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checklistItemSchema, checklistTemplateSchema } from '@/lib/validations';
import { getProfile } from '@/lib/queries';

export async function addChecklistItem(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const eventId = formData.get('event_id') as string;
  const title = formData.get('title') as string;

  const result = checklistItemSchema.safeParse({ title, event_id: eventId });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  // Get current max sort order
  const { data: existing } = await supabase
    .from('checklist_items')
    .select('sort_order')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from('checklist_items').insert({
    event_id: eventId,
    family_id: profile.family_id,
    title: result.data.title,
    sort_order: nextOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
}

export async function toggleChecklistItem(itemId: string, isCompleted: boolean) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('checklist_items')
    .select('event_id')
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

  revalidatePath(`/events/${item.event_id}`);
}

export async function deleteChecklistItem(itemId: string) {
  const supabase = await createClient();

  const { data: item } = await supabase
    .from('checklist_items')
    .select('event_id')
    .eq('id', itemId)
    .single();

  if (!item) {
    return { error: 'Item not found' };
  }

  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/events/${item.event_id}`);
}

export async function createChecklistTemplate(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const name = formData.get('name') as string;
  const itemsJson = formData.get('items') as string;

  let items: { title: string }[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { error: 'Invalid items format' };
  }

  const result = checklistTemplateSchema.safeParse({ name, items });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase.from('checklist_templates').insert({
    family_id: profile.family_id,
    name: result.data.name,
    items: result.data.items,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/templates');
  redirect('/templates');
}

export async function updateChecklistTemplate(templateId: string, formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const itemsJson = formData.get('items') as string;

  let items: { title: string }[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { error: 'Invalid items format' };
  }

  const result = checklistTemplateSchema.safeParse({ name, items });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase
    .from('checklist_templates')
    .update({
      name: result.data.name,
      items: result.data.items,
    })
    .eq('id', templateId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/templates');
  redirect('/templates');
}

export async function deleteChecklistTemplate(templateId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('checklist_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/templates');
}

export async function applyTemplateToEvent(eventId: string, templateId: string) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  // Get template
  const { data: template } = await supabase
    .from('checklist_templates')
    .select('items')
    .eq('id', templateId)
    .single();

  if (!template) {
    return { error: 'Template not found' };
  }

  const items = template.items as { title: string }[];

  // Get current max sort order
  const { data: existing } = await supabase
    .from('checklist_items')
    .select('sort_order')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: false })
    .limit(1);

  let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  // Insert all items from template
  const { error } = await supabase.from('checklist_items').insert(
    items.map((item) => ({
      event_id: eventId,
      family_id: profile.family_id,
      title: item.title,
      sort_order: nextOrder++,
    }))
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
}
