'use client';

import { useState } from 'react';
import { BankTransactionWithLinkedEvent, Event } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney, formatDate } from '@/lib/utils';
import { linkTransactionToEvent, unlinkTransaction } from '@/lib/actions/bank';
import { useRouter } from 'next/navigation';
import { X, Calendar, DollarSign, Check, Unlink, Link2 } from 'lucide-react';

interface MatchTransactionDialogProps {
  transaction: BankTransactionWithLinkedEvent;
  events: Event[];
  onClose: () => void;
}

export function MatchTransactionDialog({
  transaction,
  events,
  onClose,
}: MatchTransactionDialogProps) {
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const router = useRouter();
  const isCurrentlyLinked = !!transaction.linked_event;

  // Sort events by how close their date is to the transaction date
  // and how close their estimated cost is to the transaction amount
  const sortedEvents = [...events].sort((a, b) => {
    const txDate = new Date(transaction.date).getTime();
    const dateA = Math.abs(new Date(a.event_date).getTime() - txDate);
    const dateB = Math.abs(new Date(b.event_date).getTime() - txDate);

    const amountA = Math.abs(a.estimated_cost - transaction.amount);
    const amountB = Math.abs(b.estimated_cost - transaction.amount);

    // Combined score (weighted equally)
    const scoreA = dateA / (1000 * 60 * 60 * 24) + amountA / 100; // Days + dollars difference
    const scoreB = dateB / (1000 * 60 * 60 * 24) + amountB / 100;

    return scoreA - scoreB;
  });

  async function handleLink() {
    if (!selectedEventId) return;

    setLinking(true);
    await linkTransactionToEvent(transaction.id, selectedEventId);
    router.refresh();
    onClose();
  }

  async function handleUnlink() {
    setUnlinking(true);
    await unlinkTransaction(transaction.id);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Link Transaction to Event</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Transaction info */}
        <div className="p-4 border-b bg-muted/50">
          <p className="font-medium">
            {transaction.merchant_name || transaction.name}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span>{formatDate(transaction.date)}</span>
            <span className="font-medium text-foreground">
              {formatMoney(transaction.amount)}
            </span>
          </div>
        </div>

        {/* Currently linked event */}
        {isCurrentlyLinked && transaction.linked_event && (
          <div className="p-4 border-b bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium flex items-center gap-1">
                  <Link2 className="h-4 w-4" />
                  Currently linked to:
                </p>
                <p className="font-medium mt-1">{transaction.linked_event.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(transaction.linked_event.event_date)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={unlinking}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Unlink className="h-4 w-4 mr-1" />
                {unlinking ? 'Unlinking...' : 'Unlink'}
              </Button>
            </div>
          </div>
        )}

        {/* Events list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sortedEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No upcoming events to link to.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Select an event to link this transaction to:
              </p>
              {sortedEvents.map((event) => {
                const isSelected = selectedEventId === event.id;
                const dateDiff = Math.abs(
                  (new Date(event.event_date).getTime() -
                    new Date(transaction.date).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                const amountDiff = Math.abs(
                  event.estimated_cost - transaction.amount
                );
                const isGoodMatch = dateDiff <= 3 && amountDiff < event.estimated_cost * 0.2;

                return (
                  <Card
                    key={event.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(event.event_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatMoney(event.estimated_cost)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isGoodMatch && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              Good match
                            </span>
                          )}
                          {isSelected && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedEventId || linking}
          >
            {linking ? 'Linking...' : 'Link Transaction'}
          </Button>
        </div>
      </div>
    </div>
  );
}
