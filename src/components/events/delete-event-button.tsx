'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteEvent, deleteEventSeries } from '@/lib/actions/events';
import { Button } from '@/components/ui/button';

interface DeleteEventButtonProps {
  eventId: string;
  isParentEvent?: boolean;
}

export function DeleteEventButton({ eventId, isParentEvent }: DeleteEventButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDeleteSingle() {
    setPending(true);
    await deleteEvent(eventId);
  }

  async function handleDeleteSeries() {
    setPending(true);
    await deleteEventSeries(eventId);
  }

  if (confirming) {
    if (isParentEvent) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Delete:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteSingle}
            disabled={pending}
          >
            This only
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSeries}
            disabled={pending}
          >
            {pending ? 'Deleting...' : 'All in series'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Delete?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteSingle}
          disabled={pending}
        >
          {pending ? 'Deleting...' : 'Yes'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirming(true)}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </Button>
  );
}
