'use client';

import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChecklistItem } from '@/lib/supabase/types';

interface ChecklistItemsProps {
  checklistId: string;
  items: ChecklistItem[];
  readonly?: boolean;
}

export function ChecklistItems({ checklistId, items, readonly }: ChecklistItemsProps) {
  const [newItem, setNewItem] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  async function handleAddItem(formData: FormData) {
    setAddingItem(true);
    formData.set('checklist_id', checklistId);
    await addChecklistItem(formData);
    setNewItem('');
    setAddingItem(false);
  }

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              readonly={readonly}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {readonly ? 'No items' : 'No items yet. Add your first item below.'}
        </p>
      )}

      {!readonly && (
        <form action={handleAddItem} className="flex gap-2">
          <Input
            name="title"
            placeholder="Add a checklist item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            disabled={addingItem}
          />
          <Button type="submit" size="icon" disabled={!newItem.trim() || addingItem}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}

function ChecklistItemRow({
  item,
  readonly,
}: {
  item: ChecklistItem;
  readonly?: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    await toggleChecklistItem(item.id, !item.is_completed);
    setPending(false);
  }

  async function handleDelete() {
    setPending(true);
    await deleteChecklistItem(item.id);
  }

  return (
    <li className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group">
      <button
        type="button"
        onClick={handleToggle}
        disabled={readonly || pending}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          item.is_completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-muted-foreground/50 hover:border-primary'
        } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {item.is_completed && <Check className="h-3 w-3" />}
      </button>
      <span
        className={`flex-1 ${
          item.is_completed ? 'line-through text-muted-foreground' : ''
        }`}
      >
        {item.title}
      </span>
      {!readonly && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
