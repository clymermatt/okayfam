'use client';

import { useState } from 'react';
import { Plus, Trash2, Check, FileText, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem, applyTemplateToEvent } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistItem, ChecklistTemplate } from '@/lib/supabase/types';

interface EventChecklistProps {
  eventId: string;
  items: ChecklistItem[];
  templates: ChecklistTemplate[];
  readonly?: boolean;
}

export function EventChecklist({ eventId, items, templates, readonly }: EventChecklistProps) {
  const [newItem, setNewItem] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const completedCount = items.filter(item => item.is_completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function handleAddItem(formData: FormData) {
    setAddingItem(true);
    formData.set('event_id', eventId);
    await addChecklistItem(formData);
    setNewItem('');
    setAddingItem(false);
  }

  async function handleApplyTemplate(templateId: string) {
    setApplyingTemplate(true);
    await applyTemplateToEvent(eventId, templateId);
    setApplyingTemplate(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Prep Checklist</CardTitle>
          {totalCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} completed ({progress}%)
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Items list */}
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
        ) : !readonly ? (
          /* Empty state with options */
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-muted-foreground">No checklist items yet</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {templates.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowTemplates(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Items
              </Button>
              {templates.length === 0 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/templates/new">Create Template</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No checklist items
          </p>
        )}

        {/* Template selector */}
        {!readonly && showTemplates && templates.length > 0 && (
          <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Select a template:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(false)}
              >
                Cancel
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleApplyTemplate(template.id);
                    setShowTemplates(false);
                  }}
                  disabled={applyingTemplate}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {template.name}
                  <span className="ml-1 text-muted-foreground">
                    ({template.items.length})
                  </span>
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Or <Link href="/templates/new" className="underline">create a new template</Link>
            </p>
          </div>
        )}

        {/* Add new item form */}
        {!readonly && (items.length > 0 || showAddForm) && (
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

        {/* Additional template option when items exist */}
        {!readonly && items.length > 0 && templates.length > 0 && !showTemplates && (
          <button
            onClick={() => setShowTemplates(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add items from template
          </button>
        )}
      </CardContent>
    </Card>
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
