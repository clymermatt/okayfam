'use client';

import { useState } from 'react';
import { MerchantRuleWithEvent, Event } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMerchantRule, deleteMerchantRule } from '@/lib/actions/bank';
import { Trash2, Plus, Zap, Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MerchantSuggestion } from '@/lib/queries';

interface MerchantRulesProps {
  rules: MerchantRuleWithEvent[];
  events: Event[];
  suggestions?: MerchantSuggestion[];
}

export function MerchantRules({ rules, events, suggestions = [] }: MerchantRulesProps) {
  const [keyword, setKeyword] = useState('');
  const [eventId, setEventId] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingSuggestion, setCreatingSuggestion] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreateFromSuggestion(suggestion: MerchantSuggestion, selectedEventId: string) {
    if (!selectedEventId) return;

    setCreatingSuggestion(suggestion.keyword);
    setError(null);

    const result = await createMerchantRule(suggestion.keyword, selectedEventId);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setCreatingSuggestion(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !eventId) return;

    setAdding(true);
    setError(null);

    const result = await createMerchantRule(keyword, eventId);
    if (result?.error) {
      setError(result.error);
    } else {
      setKeyword('');
      setEventId('');
      router.refresh();
    }
    setAdding(false);
  }

  async function handleDelete(ruleId: string) {
    setDeleting(ruleId);
    await deleteMerchantRule(ruleId);
    router.refresh();
    setDeleting(null);
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Create rules to automatically link transactions to events based on merchant name.
      </div>

      {/* Existing rules */}
      {rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">
                    &quot;{rule.keyword}&quot; → {rule.event?.title || 'Unknown event'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Transactions containing this keyword will auto-link
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(rule.id)}
                disabled={deleting === rule.id}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {rules.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
          No rules yet. Add one below.
        </p>
      )}

      {/* Suggestions based on transaction history */}
      {suggestions.length > 0 && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Suggested rules based on your transactions
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.keyword}
                suggestion={suggestion}
                events={events}
                onCreateRule={handleCreateFromSuggestion}
                isCreating={creatingSuggestion === suggestion.keyword}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add new rule form */}
      <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t">
        {error && (
          <div className="p-2 text-sm text-red-600 bg-red-50 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="keyword" className="text-sm">
              Merchant contains
            </Label>
            <Input
              id="keyword"
              placeholder="e.g., NETFLIX, COSTCO"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="event" className="text-sm">
              Link to event
            </Label>
            <select
              id="event"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">Select an event...</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={adding || !keyword.trim() || !eventId}
        >
          <Plus className="h-4 w-4 mr-2" />
          {adding ? 'Adding...' : 'Add Rule'}
        </Button>
      </form>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  events,
  onCreateRule,
  isCreating,
}: {
  suggestion: MerchantSuggestion;
  events: Event[];
  onCreateRule: (suggestion: MerchantSuggestion, eventId: string) => void;
  isCreating: boolean;
}) {
  const [selectedEventId, setSelectedEventId] = useState('');

  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(cents) / 100);
  };

  return (
    <div className="p-3 border rounded-lg bg-amber-50/50 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">&quot;{suggestion.keyword}&quot;</p>
          <p className="text-xs text-muted-foreground">
            {suggestion.count} transactions · {formatMoney(suggestion.totalAmount)} total
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="flex-1 h-8 px-2 rounded-md border bg-background text-sm"
          disabled={isCreating}
        >
          <option value="">Link to event...</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onCreateRule(suggestion, selectedEventId)}
          disabled={!selectedEventId || isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Rule'}
        </Button>
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">
          View sample transactions
        </summary>
        <ul className="mt-1 space-y-1 pl-2">
          {suggestion.transactions.map((tx, i) => (
            <li key={i}>
              {tx.date}: {tx.name} ({formatMoney(tx.amount)})
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
