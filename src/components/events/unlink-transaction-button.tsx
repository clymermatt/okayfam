'use client';

import { useState } from 'react';
import { Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { unlinkTransactionAndReopen } from '@/lib/actions/events';
import { formatMoney, formatDate } from '@/lib/utils';

interface LinkedTransaction {
  id: string;
  name: string;
  merchant_name: string | null;
  date: string;
  amount: number;
}

interface UnlinkTransactionButtonProps {
  eventId: string;
  transaction: LinkedTransaction;
}

export function UnlinkTransactionButton({ eventId, transaction }: UnlinkTransactionButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleUnlink() {
    if (!confirm('This will unlink the transaction and set the event back to "Upcoming". Continue?')) {
      return;
    }

    setPending(true);
    const result = await unlinkTransactionAndReopen(eventId);
    if (result?.error) {
      alert(result.error);
    }
    setPending(false);
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/50">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">Linked Transaction</h3>
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="font-medium">{transaction.merchant_name || transaction.name}</p>
          <p className="text-sm text-muted-foreground">{formatDate(transaction.date)}</p>
        </div>
        <p className="font-semibold">{formatMoney(transaction.amount)}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={handleUnlink}
        disabled={pending}
      >
        <Unlink className="h-4 w-4 mr-2" />
        {pending ? 'Unlinking...' : 'Unlink & Reopen Event'}
      </Button>
    </div>
  );
}
