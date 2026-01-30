// @ts-nocheck - Supabase types not generated
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eventSchema, completeEventSchema } from '@/lib/validations';
import { getProfile } from '@/lib/queries';
import { RecurrenceType, EventType } from '@/lib/supabase/types';

// Helper to generate recurring dates
function generateRecurringDates(
  startDate: string,
  recurrence: RecurrenceType,
  endDate?: string
): string[] {
  if (!recurrence) return [];

  const dates: string[] = [];
  const start = new Date(startDate);
  const end = endDate
    ? new Date(endDate)
    : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());

  let current = new Date(start);

  // Skip the first date (that's the parent event)
  switch (recurrence) {
    case 'weekly':
      current.setDate(current.getDate() + 7);
      break;
    case 'biweekly':
      current.setDate(current.getDate() + 14);
      break;
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      break;
    case 'yearly':
      current.setFullYear(current.getFullYear() + 1);
      break;
  }

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);

    switch (recurrence) {
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
  }

  return dates;
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const recurrenceValue = formData.get('recurrence') as string;
  const eventTypeValue = formData.get('event_type') as string || 'expense';
  const eventTimeValue = formData.get('event_time') as string;
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || undefined,
    event_date: formData.get('event_date') as string,
    event_time: eventTimeValue?.trim() || undefined,
    estimated_cost: parseInt(formData.get('estimated_cost') as string) || 0,
    event_type: eventTypeValue as EventType,
    participant_ids: formData.getAll('participant_ids') as string[],
    recurrence: recurrenceValue || null,
    recurrence_end_date: formData.get('recurrence_end_date') as string || undefined,
  };

  const result = eventSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const recurrence = result.data.recurrence as RecurrenceType;
  const eventType = result.data.event_type as EventType;

  // Create parent event
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      family_id: profile.family_id,
      title: result.data.title,
      description: result.data.description || null,
      event_date: result.data.event_date,
      event_time: result.data.event_time || null,
      estimated_cost: result.data.estimated_cost,
      event_type: eventType,
      created_by: profile.id,
      status: 'upcoming',
      recurrence: recurrence,
      recurrence_end_date: result.data.recurrence_end_date || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Add participants to parent event
  if (result.data.participant_ids && result.data.participant_ids.length > 0) {
    await supabase.from('event_participants').insert(
      result.data.participant_ids.map(memberId => ({
        event_id: event.id,
        family_member_id: memberId,
      }))
    );
  }

  // Generate recurring events
  if (recurrence) {
    const futureDates = generateRecurringDates(
      result.data.event_date,
      recurrence,
      result.data.recurrence_end_date
    );

    if (futureDates.length > 0) {
      const recurringEvents = futureDates.map(date => ({
        family_id: profile.family_id,
        title: result.data.title,
        description: result.data.description || null,
        event_date: date,
        event_time: result.data.event_time || null,
        estimated_cost: result.data.estimated_cost,
        event_type: eventType,
        created_by: profile.id,
        status: 'upcoming' as const,
        recurrence_parent_id: event.id,
      }));

      const { data: childEvents } = await supabase
        .from('events')
        .insert(recurringEvents)
        .select('id');

      // Add participants to child events
      if (result.data.participant_ids && result.data.participant_ids.length > 0 && childEvents) {
        const participantInserts = childEvents.flatMap(childEvent =>
          result.data.participant_ids!.map(memberId => ({
            event_id: childEvent.id,
            family_member_id: memberId,
          }))
        );
        await supabase.from('event_participants').insert(participantInserts);
      }
    }
  }

  revalidatePath('/');
  revalidatePath('/events');
  redirect(`/events/${event.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const recurrenceValue = formData.get('recurrence') as string;
  const eventTypeValue = formData.get('event_type') as string || 'expense';
  const eventTimeValue = formData.get('event_time') as string;
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || undefined,
    event_date: formData.get('event_date') as string,
    event_time: eventTimeValue?.trim() || undefined,
    estimated_cost: parseInt(formData.get('estimated_cost') as string) || 0,
    event_type: eventTypeValue as EventType,
    participant_ids: formData.getAll('participant_ids') as string[],
    recurrence: recurrenceValue || null,
    recurrence_end_date: formData.get('recurrence_end_date') as string || undefined,
  };

  const result = eventSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const recurrence = result.data.recurrence as RecurrenceType;
  const eventType = result.data.event_type as EventType;

  // Get the current event to check if it already has recurrence
  const { data: currentEvent } = await supabase
    .from('events')
    .select('recurrence, recurrence_parent_id')
    .eq('id', eventId)
    .single();

  const isChildEvent = !!currentEvent?.recurrence_parent_id;
  const hadRecurrence = !!currentEvent?.recurrence;
  const hasRecurrence = !!recurrence;

  // Update the event
  const updateData: Record<string, unknown> = {
    title: result.data.title,
    description: result.data.description || null,
    event_date: result.data.event_date,
    event_time: result.data.event_time || null,
    estimated_cost: result.data.estimated_cost,
    event_type: eventType,
  };

  // Only update recurrence fields if this is not a child event
  if (!isChildEvent) {
    updateData.recurrence = recurrence;
    updateData.recurrence_end_date = result.data.recurrence_end_date || null;
  }

  const { error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId);

  if (error) {
    return { error: error.message };
  }

  // Update participants - delete existing and re-add
  await supabase.from('event_participants').delete().eq('event_id', eventId);

  if (result.data.participant_ids && result.data.participant_ids.length > 0) {
    await supabase.from('event_participants').insert(
      result.data.participant_ids.map(memberId => ({
        event_id: eventId,
        family_member_id: memberId,
      }))
    );
  }

  // If recurrence was just added (not editing a child event), generate future events
  if (!isChildEvent && !hadRecurrence && hasRecurrence) {
    const futureDates = generateRecurringDates(
      result.data.event_date,
      recurrence,
      result.data.recurrence_end_date
    );

    if (futureDates.length > 0) {
      const recurringEvents = futureDates.map(date => ({
        family_id: profile.family_id,
        title: result.data.title,
        description: result.data.description || null,
        event_date: date,
        event_time: result.data.event_time || null,
        estimated_cost: result.data.estimated_cost,
        event_type: eventType,
        created_by: profile.id,
        status: 'upcoming' as const,
        recurrence_parent_id: eventId,
      }));

      const { data: childEvents } = await supabase
        .from('events')
        .insert(recurringEvents)
        .select('id');

      // Add participants to child events
      if (result.data.participant_ids && result.data.participant_ids.length > 0 && childEvents) {
        const participantInserts = childEvents.flatMap(childEvent =>
          result.data.participant_ids!.map(memberId => ({
            event_id: childEvent.id,
            family_member_id: memberId,
          }))
        );
        await supabase.from('event_participants').insert(participantInserts);
      }
    }
  }

  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();

  // Unlink any transactions linked to this event
  await supabase
    .from('bank_transactions')
    .update({ linked_event_id: null })
    .eq('linked_event_id', eventId);

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath('/transactions');
  redirect('/events');
}

export async function deleteEventSeries(parentEventId: string) {
  const supabase = await createClient();

  // Get all event IDs in the series
  const { data: childEvents } = await supabase
    .from('events')
    .select('id')
    .eq('recurrence_parent_id', parentEventId);

  const allEventIds = [parentEventId, ...(childEvents || []).map(e => e.id)];

  // Unlink any transactions linked to these events
  await supabase
    .from('bank_transactions')
    .update({ linked_event_id: null })
    .in('linked_event_id', allEventIds);

  // Delete all child events first
  await supabase
    .from('events')
    .delete()
    .eq('recurrence_parent_id', parentEventId);

  // Then delete the parent
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', parentEventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath('/transactions');
  redirect('/events');
}

export async function updateEventSeries(parentEventId: string, formData: FormData) {
  const supabase = await createClient();
  const profile = await getProfile();

  if (!profile?.family_id) {
    return { error: 'No family found' };
  }

  const eventTypeValue = formData.get('event_type') as string || 'expense';
  const eventTimeValue = formData.get('event_time') as string;
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || undefined,
    event_date: formData.get('event_date') as string,
    event_time: eventTimeValue?.trim() || undefined,
    estimated_cost: parseInt(formData.get('estimated_cost') as string) || 0,
    event_type: eventTypeValue as EventType,
    participant_ids: formData.getAll('participant_ids') as string[],
    recurrence: formData.get('recurrence') as string || null,
    recurrence_end_date: formData.get('recurrence_end_date') as string || undefined,
  };

  const result = eventSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const eventType = result.data.event_type as EventType;

  // Data to update (excluding date since each event has its own date)
  const updateData = {
    title: result.data.title,
    description: result.data.description || null,
    event_time: result.data.event_time || null,
    estimated_cost: result.data.estimated_cost,
    event_type: eventType,
  };

  // Update the parent event
  const { error: parentError } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', parentEventId);

  if (parentError) {
    return { error: parentError.message };
  }

  // Update all upcoming child events (don't touch completed ones)
  const { error: childError } = await supabase
    .from('events')
    .update(updateData)
    .eq('recurrence_parent_id', parentEventId)
    .eq('status', 'upcoming');

  if (childError) {
    return { error: childError.message };
  }

  // Get all event IDs in the series to update participants
  const { data: seriesEvents } = await supabase
    .from('events')
    .select('id')
    .or(`id.eq.${parentEventId},recurrence_parent_id.eq.${parentEventId}`)
    .eq('status', 'upcoming');

  if (seriesEvents && seriesEvents.length > 0) {
    const eventIds = seriesEvents.map(e => e.id);

    // Delete existing participants for all events in series
    await supabase
      .from('event_participants')
      .delete()
      .in('event_id', eventIds);

    // Add new participants to all events in series
    if (result.data.participant_ids && result.data.participant_ids.length > 0) {
      const participantInserts = eventIds.flatMap(eventId =>
        result.data.participant_ids!.map(memberId => ({
          event_id: eventId,
          family_member_id: memberId,
        }))
      );
      await supabase.from('event_participants').insert(participantInserts);
    }
  }

  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath(`/events/${parentEventId}`);
  redirect(`/events/${parentEventId}`);
}

export async function completeEvent(formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    event_id: formData.get('event_id') as string,
    actual_cost: parseInt(formData.get('actual_cost') as string) || 0,
  };

  const result = completeEventSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const { error } = await supabase
    .from('events')
    .update({
      status: 'completed',
      actual_cost: result.data.actual_cost,
    })
    .eq('id', result.data.event_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath(`/events/${result.data.event_id}`);
  revalidatePath('/budget');
}

export async function cancelEvent(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath(`/events/${eventId}`);
}

export async function completeCalendarEvent(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('events')
    .update({
      status: 'completed',
      actual_cost: 0, // Calendar events have no cost
    })
    .eq('id', eventId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/events');
  revalidatePath(`/events/${eventId}`);
}
