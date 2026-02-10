'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { linkChecklistToEvent } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';
import { Event } from '@/lib/supabase/types';

interface LinkEventDialogProps {
  checklistId: string;
  events: Event[];
}

export function LinkEventDialog({ checklistId, events }: LinkEventDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');

  async function handleLink() {
    if (!selectedEventId) return;
    setPending(true);
    await linkChecklistToEvent(checklistId, selectedEventId);
    setPending(false);
    setIsOpen(false);
  }

  if (events.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        No upcoming events to link
      </span>
    );
  }

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Link2 className="h-4 w-4 mr-2" />
        Link to Event
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <select
        value={selectedEventId}
        onChange={(e) => setSelectedEventId(e.target.value)}
        disabled={pending}
        className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
      >
        <option value="">Select an event...</option>
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.title} - {new Date(event.event_date).toLocaleDateString()}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        onClick={handleLink}
        disabled={!selectedEventId || pending}
      >
        {pending ? 'Linking...' : 'Link'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setIsOpen(false);
          setSelectedEventId('');
        }}
        disabled={pending}
      >
        Cancel
      </Button>
    </div>
  );
}
