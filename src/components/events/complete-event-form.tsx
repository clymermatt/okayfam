'use client';

import { useState } from 'react';
import { Check, CreditCard } from 'lucide-react';
import { completeEvent } from '@/lib/actions/events';
import { linkTransactionToEvent } from '@/lib/actions/bank';
import { parseMoney, formatMoney, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BankTransactionWithAccount } from '@/lib/supabase/types';

interface CompleteEventFormProps {
  eventId: string;
  estimatedCost: number;
  isIncome?: boolean;
  matchingTransactions?: BankTransactionWithAccount[];
}

export function CompleteEventForm({ eventId, estimatedCost, isIncome, matchingTransactions = [] }: CompleteEventFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costDisplay, setCostDisplay] = useState((estimatedCost / 100).toFixed(2));
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransactionWithAccount | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    // Convert cost to cents
    const costInCents = selectedTransaction ? selectedTransaction.amount : parseMoney(costDisplay);
    formData.set('actual_cost', costInCents.toString());
    formData.set('event_id', eventId);

    const result = await completeEvent(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    // If a transaction was selected, link it to the event
    if (selectedTransaction) {
      await linkTransactionToEvent(selectedTransaction.id, eventId);
    }
  }

  function handleSelectTransaction(transaction: BankTransactionWithAccount) {
    setSelectedTransaction(transaction);
    setCostDisplay((transaction.amount / 100).toFixed(2));
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
        <Check className="h-4 w-4 mr-2" />
        {isIncome ? 'Mark as Received' : 'Mark as Complete'}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isIncome ? 'Record Income' : 'Complete Event'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* Matching transactions */}
          {matchingTransactions.length > 0 && !isIncome && (
            <div className="space-y-2">
              <Label>Link to Bank Transaction</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {matchingTransactions.map((tx) => (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => handleSelectTransaction(tx)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedTransaction?.id === tx.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm truncate">
                          {tx.merchant_name || tx.name}
                        </span>
                      </div>
                      <span className="font-medium text-sm">
                        {formatMoney(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{formatDate(tx.date)}</span>
                      {tx.account && (
                        <>
                          <span>·</span>
                          <span>{tx.account.name}</span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedTransaction && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTransaction(null);
                    setCostDisplay((estimatedCost / 100).toFixed(2));
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="actual_cost_display">
              {isIncome ? 'Amount Received' : 'Actual Cost'}
              {selectedTransaction && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  From bank
                </Badge>
              )}
            </Label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isIncome ? 'text-green-600' : 'text-muted-foreground'}`}>
                {isIncome ? '+$' : '$'}
              </span>
              <Input
                id="actual_cost_display"
                name="actual_cost_display"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className={isIncome ? 'pl-9' : 'pl-7'}
                value={costDisplay}
                onChange={(e) => {
                  setCostDisplay(e.target.value);
                  if (selectedTransaction) {
                    setSelectedTransaction(null);
                  }
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Expected was {isIncome && '+'}{formatMoney(estimatedCost)}
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              <Check className="h-4 w-4 mr-2" />
              {pending ? 'Saving...' : isIncome ? 'Confirm Received' : 'Complete'}
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
