'use client';

import { useState } from 'react';
import { Link2Off } from 'lucide-react';
import { unlinkChecklistFromEvent } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';

interface UnlinkEventButtonProps {
  checklistId: string;
}

export function UnlinkEventButton({ checklistId }: UnlinkEventButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleUnlink() {
    setPending(true);
    await unlinkChecklistFromEvent(checklistId);
    setPending(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleUnlink}
      disabled={pending}
      className="text-muted-foreground hover:text-foreground"
    >
      <Link2Off className="h-4 w-4 mr-1" />
      {pending ? 'Unlinking...' : 'Unlink'}
    </Button>
  );
}
