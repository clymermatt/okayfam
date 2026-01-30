'use client';

import { useState } from 'react';
import { updateFamilyName } from '@/lib/actions/family';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FamilyNameFormProps {
  currentName: string;
}

export function FamilyNameForm({ currentName }: FamilyNameFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(false);

    const result = await updateFamilyName(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
    setPending(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
          Name updated!
        </div>
      )}

      <div className="flex gap-3">
        <Input
          name="name"
          type="text"
          placeholder="The Smith Family"
          defaultValue={currentName}
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
