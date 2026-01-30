'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { createChecklistTemplate, updateChecklistTemplate } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ChecklistTemplate } from '@/lib/supabase/types';

interface TemplateFormProps {
  template?: ChecklistTemplate;
}

export function TemplateForm({ template }: TemplateFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [items, setItems] = useState<{ title: string }[]>(
    template?.items || [{ title: '' }]
  );
  const [newItem, setNewItem] = useState('');

  const isEditing = !!template;

  function addItem() {
    if (newItem.trim()) {
      setItems([...items, { title: newItem.trim() }]);
      setNewItem('');
    }
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, title: string) {
    const updated = [...items];
    updated[index] = { title };
    setItems(updated);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    // Filter out empty items
    const validItems = items.filter(item => item.title.trim());
    formData.set('items', JSON.stringify(validItems));

    const result = isEditing
      ? await updateChecklistTemplate(template.id, formData)
      : await createChecklistTemplate(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Birthday Party Prep"
              defaultValue={template?.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Checklist Items</Label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <Input
                    value={item.title}
                    onChange={(e) => updateItem(index, e.target.value)}
                    placeholder="Checklist item..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add another item..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={pending}>
              {pending
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                ? 'Save Changes'
                : 'Create Template'}
            </Button>
            <Button type="button" variant="outline" onClick={() => history.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
