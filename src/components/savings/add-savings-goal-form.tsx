'use client';

import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { createSavingsGoal } from '@/lib/actions/savings';
import { parseMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export function AddSavingsGoalForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountDisplay, setAmountDisplay] = useState('');

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    // Convert amount to cents
    const amountInCents = parseMoney(amountDisplay);
    formData.set('target_amount', amountInCents.toString());

    const result = await createSavingsGoal(formData);

    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else {
      setIsOpen(false);
      setAmountDisplay('');
      setPending(false);
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Savings Goal
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">New Savings Goal</h3>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">What are you saving for?</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Vacation, New Car, Emergency Fund"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Target Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="target_amount"
                  name="target_amount_display"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountDisplay}
                  onChange={(e) => setAmountDisplay(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_date">Target Date</Label>
              <Input
                id="target_date"
                name="target_date"
                type="date"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating...' : 'Create Goal'}
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
      </CardContent>
    </Card>
  );
}
