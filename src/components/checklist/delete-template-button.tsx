'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteChecklistTemplate } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';

interface DeleteTemplateButtonProps {
  templateId: string;
}

export function DeleteTemplateButton({ templateId }: DeleteTemplateButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this template?')) return;
    setPending(true);
    await deleteChecklistTemplate(templateId);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={pending}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
