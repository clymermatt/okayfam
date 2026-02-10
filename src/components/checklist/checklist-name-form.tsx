'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { updateChecklist } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checklist } from '@/lib/supabase/types';

interface ChecklistNameFormProps {
  checklist: Checklist;
}

export function ChecklistNameForm({ checklist }: ChecklistNameFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(checklist.name);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setPending(true);
    const formData = new FormData();
    formData.set('name', name.trim());
    await updateChecklist(checklist.id, formData);
    setPending(false);
    setIsEditing(false);
  }

  function handleCancel() {
    setName(checklist.name);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group">
        <h1 className="text-2xl font-bold truncate">{checklist.name}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={pending}
        className="text-xl font-bold"
        autoFocus
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={!name.trim() || pending}
        className="h-8 w-8"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        disabled={pending}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}
