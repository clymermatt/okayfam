'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteChecklist } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';

interface DeleteChecklistButtonProps {
  checklistId: string;
  variant?: 'ghost' | 'outline' | 'destructive';
}

export function DeleteChecklistButton({ checklistId, variant = 'ghost' }: DeleteChecklistButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setPending(true);
    try {
      await deleteChecklist(checklistId);
    } catch {
      // Redirect happens in the server action
    }
    setPending(false);
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDelete();
          }}
          disabled={pending}
        >
          {pending ? 'Deleting...' : 'Confirm'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(false);
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirming(true);
      }}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
