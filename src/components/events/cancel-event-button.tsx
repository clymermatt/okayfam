'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cancelEvent } from '@/lib/actions/events';
import { Button } from '@/components/ui/button';

interface CancelEventButtonProps {
  eventId: string;
}

export function CancelEventButton({ eventId }: CancelEventButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleCancel() {
    setPending(true);
    await cancelEvent(eventId);
    setPending(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCancel}
      disabled={pending}
    >
      <X className="h-4 w-4 mr-2" />
      {pending ? 'Cancelling...' : 'Cancel Event'}
    </Button>
  );
}
