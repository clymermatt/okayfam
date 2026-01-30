'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { completeCalendarEvent } from '@/lib/actions/events';
import { Button } from '@/components/ui/button';

interface MarkCalendarEventCompleteProps {
  eventId: string;
}

export function MarkCalendarEventComplete({ eventId }: MarkCalendarEventCompleteProps) {
  const [pending, setPending] = useState(false);

  async function handleComplete() {
    setPending(true);
    await completeCalendarEvent(eventId);
  }

  return (
    <Button onClick={handleComplete} disabled={pending} className="w-full sm:w-auto">
      <Check className="h-4 w-4 mr-2" />
      {pending ? 'Marking...' : 'Mark as Done'}
    </Button>
  );
}
