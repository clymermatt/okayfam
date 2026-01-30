'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { updateFamilyMember, deleteFamilyMember } from '@/lib/actions/family';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FamilyMember } from '@/lib/supabase/types';

interface FamilyMembersListProps {
  members: FamilyMember[];
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function FamilyMembersList({ members }: FamilyMembersListProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No family members added yet
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <FamilyMemberRow key={member.id} member={member} />
      ))}
    </ul>
  );
}

function FamilyMemberRow({ member }: { member: FamilyMember }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(member.name);
  const [color, setColor] = useState(member.color);

  async function handleSave() {
    setPending(true);
    const formData = new FormData();
    formData.set('name', name);
    formData.set('color', color);
    await updateFamilyMember(member.id, formData);
    setPending(false);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Remove ${member.name}?`)) return;
    setPending(true);
    await deleteFamilyMember(member.id);
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 p-2 rounded-md bg-muted">
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${
                color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={pending}>
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setName(member.name);
            setColor(member.color);
          }}
          disabled={pending}
        >
          <X className="h-4 w-4" />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 p-2 rounded-md hover:bg-muted group">
      <span
        className="w-4 h-4 rounded-full"
        style={{ backgroundColor: member.color }}
      />
      <span className="flex-1">{member.name}</span>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDelete}
        disabled={pending}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
