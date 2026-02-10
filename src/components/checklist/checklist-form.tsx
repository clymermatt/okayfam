'use client';

import { useState } from 'react';
import { createChecklist } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Event } from '@/lib/supabase/types';

interface ChecklistFormProps {
  events: Event[];
  preselectedEventId?: string;
}

export function ChecklistForm({ events, preselectedEventId }: ChecklistFormProps) {
  const [pending, setPending] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');

  async function handleSubmit(formData: FormData) {
    setPending(true);
    if (selectedEventId) {
      formData.set('event_id', selectedEventId);
    }
    await createChecklist(formData);
    setPending(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Checklist Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Birthday Party Prep"
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_id">Link to Event (Optional)</Label>
            <select
              id="event_id"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={pending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No event (standalone)</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} - {new Date(event.event_date).toLocaleDateString()}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Event-linked checklists complete automatically when the event is marked complete.
            </p>
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Creating...' : 'Create Checklist'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
