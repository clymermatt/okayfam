'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toggleChecklistComplete } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';

interface ToggleCompleteButtonProps {
  checklistId: string;
  isCompleted: boolean;
  disabled?: boolean;
}

export function ToggleCompleteButton({ checklistId, isCompleted, disabled }: ToggleCompleteButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    await toggleChecklistComplete(checklistId, !isCompleted);
    setPending(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={pending || disabled}
      className={isCompleted ? 'text-green-600 border-green-600' : ''}
    >
      <CheckCircle2 className="h-4 w-4 mr-2" />
      {pending
        ? 'Updating...'
        : isCompleted
        ? 'Completed'
        : 'Mark Complete'}
    </Button>
  );
}
