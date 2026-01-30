'use client';

import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { createEvent, updateEvent, updateEventSeries } from '@/lib/actions/events';
import { parseMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FamilyMember, Event, RecurrenceType, EventType } from '@/lib/supabase/types';

interface EventFormProps {
  familyMembers: FamilyMember[];
  event?: Event;
  participantIds?: string[];
}

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: null, label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// Generate time options every 15 minutes
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const value = `${h}:${m}`;

      // Format for display (12-hour with AM/PM)
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${displayHour}:${m} ${ampm}`;

      options.push({ value, label });
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

type CostType = 'none' | 'expense' | 'income';

function getCostTypeFromEvent(event?: Event): CostType {
  if (!event) return 'none';
  if (event.event_type === 'calendar') return 'none';
  if (event.event_type === 'income') return 'income';
  return 'expense';
}

export function EventForm({ familyMembers, event, participantIds = [] }: EventFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [costType, setCostType] = useState<CostType>(getCostTypeFromEvent(event));
  const [costDisplay, setCostDisplay] = useState(
    event?.estimated_cost ? (event.estimated_cost / 100).toFixed(2) : ''
  );
  const [recurrence, setRecurrence] = useState<RecurrenceType>(event?.recurrence || null);
  const [editScope, setEditScope] = useState<'single' | 'series'>('single');

  const isEditing = !!event;
  const isChildEvent = !!event?.recurrence_parent_id;
  const isParentEvent = !!event?.recurrence && !event?.recurrence_parent_id;
  const isRecurring = isChildEvent || isParentEvent;

  // Determine event_type from costType
  const eventType: EventType = costType === 'none' ? 'calendar' : costType;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    // Convert cost to cents (0 for calendar events)
    const costInCents = costType === 'none' ? 0 : parseMoney(formData.get('estimated_cost_display') as string);
    formData.set('estimated_cost', costInCents.toString());
    formData.set('event_type', eventType);

    let result;
    if (isEditing) {
      if (editScope === 'series' && isRecurring) {
        // Get the parent event ID
        const parentId = event.recurrence_parent_id || event.id;
        result = await updateEventSeries(parentId, formData);
      } else {
        result = await updateEvent(event.id, formData);
      }
    } else {
      result = await createEvent(formData);
    }

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* 1. Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Soccer practice, Doctor appointment, Paycheck"
              defaultValue={event?.title}
              required
            />
          </div>

          {/* 2. Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="Any additional details..."
              defaultValue={event?.description || ''}
            />
          </div>

          {/* 3. Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_date">Date</Label>
              <Input
                id="event_date"
                name="event_date"
                type="date"
                defaultValue={event?.event_date}
                required
              />
            </div>

            {/* 4. Time (optional) */}
            <div className="space-y-2">
              <Label htmlFor="event_time">Time (optional)</Label>
              <select
                id="event_time"
                name="event_time"
                defaultValue={event?.event_time?.slice(0, 5) || ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No time</option>
                {TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Cost/Amount with type selector */}
          <div className="space-y-2">
            <Label>Amount (optional)</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCostType('none')}
                className={`px-3 py-2 rounded-md border transition-colors text-sm ${
                  costType === 'none'
                    ? 'bg-muted border-primary text-foreground'
                    : 'bg-background border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                No cost
              </button>
              <button
                type="button"
                onClick={() => setCostType('expense')}
                className={`px-3 py-2 rounded-md border transition-colors text-sm ${
                  costType === 'expense'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-background border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setCostType('income')}
                className={`px-3 py-2 rounded-md border transition-colors text-sm ${
                  costType === 'income'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-background border-input hover:bg-muted text-muted-foreground'
                }`}
              >
                Income
              </button>
            </div>

            {costType !== 'none' && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-lg font-medium ${
                  costType === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {costType === 'income' ? '+$' : '-$'}
                </span>
                <Input
                  id="estimated_cost_display"
                  name="estimated_cost_display"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="flex-1"
                  value={costDisplay}
                  onChange={(e) => setCostDisplay(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Recurrence - only show for new events or parent events */}
          {!isChildEvent && (
            <div className="space-y-2">
              <Label htmlFor="recurrence">
                <Repeat className="inline h-4 w-4 mr-1" />
                Repeat
              </Label>
              <select
                id="recurrence"
                name="recurrence"
                value={recurrence || ''}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType || null)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value || 'none'} value={option.value || ''}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recurrence end date */}
          {!isChildEvent && recurrence && (
            <div className="space-y-2">
              <Label htmlFor="recurrence_end_date">Repeat until (optional)</Label>
              <Input
                id="recurrence_end_date"
                name="recurrence_end_date"
                type="date"
                defaultValue={event?.recurrence_end_date || ''}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to repeat for 1 year
              </p>
            </div>
          )}

          {/* Edit scope for recurring events */}
          {isEditing && isRecurring && (
            <div className="space-y-2">
              <Label>
                <Repeat className="inline h-4 w-4 mr-1" />
                Apply changes to
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditScope('single')}
                  className={`flex-1 px-3 py-2 rounded-md border-2 transition-colors text-sm bg-background ${
                    editScope === 'single'
                      ? 'border-primary text-primary font-medium'
                      : 'border-input text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  This event only
                </button>
                <button
                  type="button"
                  onClick={() => setEditScope('series')}
                  className={`flex-1 px-3 py-2 rounded-md border-2 transition-colors text-sm bg-background ${
                    editScope === 'series'
                      ? 'border-primary text-primary font-medium'
                      : 'border-input text-muted-foreground hover:border-muted-foreground'
                  }`}
                >
                  All events in series
                </button>
              </div>
              {editScope === 'series' && (
                <p className="text-xs text-muted-foreground">
                  This will update all upcoming events in the series. Completed events will not be changed.
                </p>
              )}
            </div>
          )}

          {familyMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Participants</Label>
              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member) => (
                  <label
                    key={member.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border-2 cursor-pointer hover:border-muted-foreground transition-colors has-[:checked]:border-primary has-[:checked]:text-primary has-[:checked]:font-medium"
                  >
                    <input
                      type="checkbox"
                      name="participant_ids"
                      value={member.id}
                      defaultChecked={participantIds.includes(member.id)}
                      className="sr-only"
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    {member.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={pending}>
              {pending
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                ? 'Save Changes'
                : 'Create Event'}
            </Button>
            <Button type="button" variant="outline" onClick={() => history.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
