'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reopenEvent } from '@/lib/actions/events';

interface ReopenEventButtonProps {
  eventId: string;
}

export function ReopenEventButton({ eventId }: ReopenEventButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleReopen() {
    if (!confirm('This will set the event back to "Upcoming" and clear the actual cost. Continue?')) {
      return;
    }

    setPending(true);
    const result = await reopenEvent(eventId);
    if (result?.error) {
      alert(result.error);
    }
    setPending(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReopen}
      disabled={pending}
    >
      <RotateCcw className="h-4 w-4 mr-2" />
      {pending ? 'Reopening...' : 'Reopen Event'}
    </Button>
  );
}
