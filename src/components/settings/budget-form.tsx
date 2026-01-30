'use client';

import { useState } from 'react';
import { updateBudget } from '@/lib/actions/family';
import { parseMoney, formatMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BudgetFormProps {
  currentBudget: number;
}

export function BudgetForm({ currentBudget }: BudgetFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [budgetDisplay, setBudgetDisplay] = useState(
    currentBudget ? (currentBudget / 100).toFixed(2) : ''
  );

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(false);

    const budgetInCents = parseMoney(budgetDisplay);
    formData.set('monthly_budget', budgetInCents.toString());

    const result = await updateBudget(formData);
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
          Budget updated!
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            name="budget_display"
            type="text"
            inputMode="decimal"
            placeholder="3000.00"
            className="pl-7"
            value={budgetDisplay}
            onChange={(e) => setBudgetDisplay(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
