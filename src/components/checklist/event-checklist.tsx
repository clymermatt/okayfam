'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Check, Link2, Link2Off } from 'lucide-react';
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem, unlinkChecklistFromEvent, linkChecklistToEvent } from '@/lib/actions/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistWithItems, ChecklistItem, Checklist } from '@/lib/supabase/types';

interface EventChecklistProps {
  eventId: string;
  checklists: ChecklistWithItems[];
  unlinkedChecklists: Checklist[];
  readonly?: boolean;
}

export function EventChecklist({ eventId, checklists, unlinkedChecklists, readonly }: EventChecklistProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedChecklistId, setSelectedChecklistId] = useState('');
  const [linkPending, setLinkPending] = useState(false);

  const totalItems = checklists.reduce((sum, cl) => sum + cl.items.length, 0);
  const completedItems = checklists.reduce(
    (sum, cl) => sum + cl.items.filter(i => i.is_completed).length,
    0
  );
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  async function handleLinkChecklist() {
    if (!selectedChecklistId) return;
    setLinkPending(true);
    await linkChecklistToEvent(selectedChecklistId, eventId);
    setLinkPending(false);
    setShowLinkDialog(false);
    setSelectedChecklistId('');
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Checklists</CardTitle>
          {totalItems > 0 && (
            <p className="text-sm text-muted-foreground">
              {completedItems} of {totalItems} items completed ({progress}%)
            </p>
          )}
        </div>
        {!readonly && (
          <div className="flex gap-2">
            {unlinkedChecklists.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkDialog(true)}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Link Existing
              </Button>
            )}
            <Button asChild size="sm">
              <Link href={`/checklists/new?event=${eventId}`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Checklist
              </Link>
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall progress bar */}
        {totalItems > 0 && (
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Link existing checklist dialog */}
        {showLinkDialog && (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <p className="text-sm font-medium">Link an existing checklist:</p>
            <select
              value={selectedChecklistId}
              onChange={(e) => setSelectedChecklistId(e.target.value)}
              disabled={linkPending}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a checklist...</option>
              {unlinkedChecklists.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleLinkChecklist}
                disabled={!selectedChecklistId || linkPending}
              >
                {linkPending ? 'Linking...' : 'Link'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLinkDialog(false);
                  setSelectedChecklistId('');
                }}
                disabled={linkPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Checklists */}
        {checklists.length > 0 ? (
          <div className="space-y-6">
            {checklists.map((checklist) => (
              <ChecklistSection
                key={checklist.id}
                checklist={checklist}
                readonly={readonly}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="mb-4">No checklists linked to this event</p>
            {!readonly && (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild>
                  <Link href={`/checklists/new?event=${eventId}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Checklist
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistSection({
  checklist,
  readonly,
}: {
  checklist: ChecklistWithItems;
  readonly?: boolean;
}) {
  const [newItem, setNewItem] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [unlinkPending, setUnlinkPending] = useState(false);

  const completedCount = checklist.items.filter(i => i.is_completed).length;
  const totalCount = checklist.items.length;

  async function handleAddItem(formData: FormData) {
    setAddingItem(true);
    formData.set('checklist_id', checklist.id);
    await addChecklistItem(formData);
    setNewItem('');
    setAddingItem(false);
  }

  async function handleUnlink() {
    setUnlinkPending(true);
    await unlinkChecklistFromEvent(checklist.id);
    setUnlinkPending(false);
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/checklists/${checklist.id}`}
            className="font-medium hover:underline"
          >
            {checklist.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {completedCount} / {totalCount} items
          </p>
        </div>
        {!readonly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnlink}
            disabled={unlinkPending}
            className="text-muted-foreground hover:text-foreground"
          >
            <Link2Off className="h-4 w-4 mr-1" />
            {unlinkPending ? 'Unlinking...' : 'Unlink'}
          </Button>
        )}
      </div>

      {/* Items list */}
      {checklist.items.length > 0 ? (
        <ul className="space-y-2">
          {checklist.items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              readonly={readonly}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          No items yet
        </p>
      )}

      {/* Add new item form */}
      {!readonly && (
        <form action={handleAddItem} className="flex gap-2">
          <Input
            name="title"
            placeholder="Add item..."
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
