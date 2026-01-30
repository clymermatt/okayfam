'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { addFamilyMember } from '@/lib/actions/family';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

export function AddFamilyMemberForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    formData.set('color', color);

    const result = await addFamilyMember(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setName('');
      setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
      setIsOpen(false);
    }
    setPending(false);
  }

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Family Member
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="p-4 rounded-md border space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-8 h-8 rounded-full transition-transform ${
              color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <Input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
      />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Adding...' : 'Add'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
