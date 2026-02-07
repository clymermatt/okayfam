'use client';

import { useState, useMemo } from 'react';
import { BankTransactionWithLinkedEvent, Event, MerchantCategory } from '@/lib/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@/lib/utils';
import {
  Link2,
  Plus,
  CreditCard,
  Building2,
  Tag,
  DollarSign,
  Calendar,
  Check
} from 'lucide-react';
import { MatchTransactionDialog } from './match-transaction-dialog';
import { createEventFromTransaction, setTransactionCategory } from '@/lib/actions/bank';
import { useRouter } from 'next/navigation';
import { MerchantCategoryWithEvent } from '@/lib/supabase/types';

type MainFilterType = 'all' | 'uncategorized' | 'categorized';

interface TransactionListProps {
  transactions: BankTransactionWithLinkedEvent[];
  upcomingEvents: Event[];
  allCategories: MerchantCategoryWithEvent[];
}

export function TransactionList({ transactions, upcomingEvents, allCategories }: TransactionListProps) {
  const [mainFilter, setMainFilter] = useState<MainFilterType>('all');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [matchingTransaction, setMatchingTransaction] = useState<BankTransactionWithCategory | null>(null);
  const [creatingEvent, setCreatingEvent] = useState<string | null>(null);
  const router = useRouter();

  // Get unique categories from transactions
  const categories = useMemo(() => {
    const categoryMap = new Map<string, MerchantCategory>();
    for (const tx of transactions) {
      if (tx.merchant_category) {
        categoryMap.set(tx.merchant_category.id, tx.merchant_category);
      }
    }
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const uncategorizedTransactions = transactions.filter(t => !t.category_id);
  const categorizedTransactions = transactions.filter(t => t.category_id);

  // Toggle category selection
  function toggleCategory(categoryId: string) {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  }

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Apply main filter
    if (mainFilter === 'uncategorized') {
      result = result.filter(t => !t.category_id);
    } else if (mainFilter === 'categorized') {
      result = result.filter(t => t.category_id);
    }

    // Apply category selection (only when categories are selected)
    if (selectedCategories.size > 0) {
      result = result.filter(t => t.category_id && selectedCategories.has(t.category_id));
    }

    return result;
  }, [transactions, mainFilter, selectedCategories]);

  async function handleCreateEvent(transactionId: string) {
    setCreatingEvent(transactionId);
    const result = await createEventFromTransaction(transactionId);
    if (result.eventId) {
      router.push(`/events/${result.eventId}`);
    }
    setCreatingEvent(null);
  }

  return (
    <div className="space-y-4">
      {/* Main filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={mainFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMainFilter('all')}
        >
          All
          <Badge variant="secondary" className="ml-2 bg-background/20">
            {transactions.length}
          </Badge>
        </Button>
        <Button
          variant={mainFilter === 'uncategorized' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMainFilter('uncategorized')}
        >
          <Tag className="h-4 w-4 mr-1" />
          Uncategorized
          <Badge variant="secondary" className="ml-2 bg-background/20">
            {uncategorizedTransactions.length}
          </Badge>
        </Button>
        <Button
          variant={mainFilter === 'categorized' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMainFilter('categorized')}
        >
          <Check className="h-4 w-4 mr-1" />
          Categorized
          <Badge variant="secondary" className="ml-2 bg-background/20">
            {categorizedTransactions.length}
          </Badge>
        </Button>
      </div>

      {/* Category checkboxes */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          {categories.map((cat) => {
            const isSelected = selectedCategories.has(cat.id);
            const isBudget = cat.category_type === 'budget';
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  isSelected
                    ? isBudget
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {isBudget ? (
                  <DollarSign className="h-3 w-3" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                {cat.name}
                {isSelected && <Check className="h-3 w-3" />}
              </button>
            );
          })}
          {selectedCategories.size > 0 && (
            <button
              onClick={() => setSelectedCategories(new Set())}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Filter description */}
      {mainFilter === 'uncategorized' && uncategorizedTransactions.length > 0 && (
        <p className="text-sm text-muted-foreground">
          These transactions need to be assigned a category.
        </p>
      )}

      {/* Transaction list */}
      {filteredTransactions.length > 0 ? (
        <div className="space-y-2">
          {filteredTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              allCategories={allCategories}
              onMatch={() => setMatchingTransaction(transaction)}
              onCreateEvent={() => handleCreateEvent(transaction.id)}
              isCreatingEvent={creatingEvent === transaction.id}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {mainFilter === 'all' && selectedCategories.size === 0
                ? 'No transactions found'
                : mainFilter === 'uncategorized'
                ? 'All transactions are categorized!'
                : mainFilter === 'categorized' && selectedCategories.size === 0
                ? 'No categorized transactions yet'
                : 'No matching transactions'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Match dialog */}
      {matchingTransaction && (
        <MatchTransactionDialog
          transaction={matchingTransaction}
          events={upcomingEvents}
          onClose={() => setMatchingTransaction(null)}
        />
      )}
    </div>
  );
}

interface TransactionCardProps {
  transaction: BankTransactionWithLinkedEvent;
  allCategories: MerchantCategoryWithEvent[];
  onMatch?: () => void;
  onCreateEvent?: () => void;
  isCreatingEvent?: boolean;
}

function TransactionCard({
  transaction,
  allCategories,
  onMatch,
  onCreateEvent,
  isCreatingEvent,
}: TransactionCardProps) {
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const isExpense = transaction.amount > 0;
  const isCategorized = !!transaction.category_id;
  const isLinked = !!transaction.linked_event_id;
  const accountIcon = transaction.account?.type === 'credit' ? CreditCard : Building2;
  const AccountIcon = accountIcon;

  async function handleCategoryChange(categoryId: string) {
    setIsSaving(true);
    await setTransactionCategory(
      transaction.id,
      categoryId === '' ? null : categoryId
    );
    router.refresh();
    setIsSaving(false);
    setIsEditingCategory(false);
  }

  return (
    <Card className={isCategorized ? 'border-green-200 bg-green-50/30' : ''}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-muted rounded-full shrink-0">
              <AccountIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">
                {transaction.merchant_name || transaction.name}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDate(transaction.date)}</span>
                {transaction.account && (
                  <>
                    <span>·</span>
                    <span className="truncate">
                      {transaction.account.name}
                      {transaction.account.mask && ` ****${transaction.account.mask}`}
                    </span>
                  </>
                )}
                {transaction.pending && (
                  <Badge variant="outline" className="text-xs">
                    Pending
                  </Badge>
                )}
              </div>

              {/* Category section */}
              <div className="flex gap-1 mt-1 items-center">
                {isEditingCategory ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={transaction.category_id || ''}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      disabled={isSaving}
                      className="h-7 px-2 rounded border bg-background text-xs"
                      autoFocus
                    >
                      <option value="">No category</option>
                      {allCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.category_type})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setIsEditingCategory(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : transaction.merchant_category ? (
                  <button
                    onClick={() => setIsEditingCategory(true)}
                    className="group flex items-center gap-1"
                    title="Click to change category"
                  >
                    <Badge
                      variant={transaction.merchant_category.category_type === 'budget' ? 'secondary' : 'outline'}
                      className={`text-xs cursor-pointer group-hover:ring-2 ring-offset-1 ${
                        transaction.merchant_category.category_type === 'budget'
                          ? 'bg-green-100 text-green-700 border-green-200 ring-green-300'
                          : 'bg-blue-100 text-blue-700 border-blue-200 ring-blue-300'
                      }`}
                    >
                      {transaction.merchant_category.category_type === 'budget' ? (
                        <DollarSign className="h-3 w-3 mr-0.5" />
                      ) : (
                        <Calendar className="h-3 w-3 mr-0.5" />
                      )}
                      {transaction.merchant_category.name}
                    </Badge>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingCategory(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Tag className="h-3 w-3" />
                    Add category
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`font-semibold ${
                isExpense ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {isExpense ? '-' : '+'}
              {formatMoney(Math.abs(transaction.amount))}
            </span>

            <div className="flex gap-1">
              {/* Link icon - always visible, colored based on link status */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onMatch}
                title={isLinked && transaction.linked_event
                  ? `Linked to: ${transaction.linked_event.title}`
                  : 'Link to event'}
                className={isLinked ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-600'}
              >
                <Link2 className="h-4 w-4" />
              </Button>

              {/* Only show create event button for uncategorized/unlinked transactions */}
              {!isCategorized && !isLinked && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCreateEvent}
                  disabled={isCreatingEvent}
                  title="Create event from transaction"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
