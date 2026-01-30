'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, Trash2, Plus, ChevronDown, ChevronUp, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { SavingsGoal } from '@/lib/supabase/types';
import { formatMoney, formatDate, calculateMonthlyContribution, calculateSavingsStatus } from '@/lib/utils';
import { contributeSavings, deleteSavingsGoal } from '@/lib/actions/savings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SavingsGoalCardProps {
  goal: SavingsGoal;
}

export function SavingsGoalCard({ goal }: SavingsGoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const recommendedContribution = calculateMonthlyContribution(goal);
  const savingsStatus = calculateSavingsStatus(goal);
  const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
  const remaining = goal.target_amount - goal.current_amount;

  async function handleContribute() {
    if (!contributionAmount) return;
    setPending(true);
    const amount = Math.round(parseFloat(contributionAmount) * 100);
    await contributeSavings(goal.id, amount);
    setContributionAmount('');
    setContributing(false);
    router.refresh();
    setPending(false);
  }

  async function handleDelete() {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      await deleteSavingsGoal(goal.id);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {goal.name}
                {/* Status badge */}
                {savingsStatus.status === 'completed' ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                ) : savingsStatus.status === 'ahead' ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Ahead
                  </Badge>
                ) : savingsStatus.status === 'behind' ? (
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Behind
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    On Track
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                Target: {formatDate(goal.target_date)} ({savingsStatus.monthsRemaining} month{savingsStatus.monthsRemaining !== 1 ? 's' : ''} left)
              </p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatMoney(goal.current_amount)} saved</span>
              <span className="text-muted-foreground">
                {formatMoney(goal.target_amount)} goal
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${
                  savingsStatus.status === 'ahead' ? 'bg-green-500' :
                  savingsStatus.status === 'behind' ? 'bg-red-500' :
                  savingsStatus.status === 'completed' ? 'bg-green-500' :
                  'bg-primary'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">
                {formatMoney(remaining)} remaining
              </span>
              {savingsStatus.status !== 'completed' && (
                <span className="font-medium text-primary">
                  Recommended: {formatMoney(recommendedContribution)}/mo
                </span>
              )}
            </div>
            {/* Status explanation */}
            {savingsStatus.status === 'ahead' && savingsStatus.difference > 0 && (
              <p className="text-xs text-green-600">
                You&apos;re {formatMoney(savingsStatus.difference)} ahead of schedule!
              </p>
            )}
            {savingsStatus.status === 'behind' && savingsStatus.difference < 0 && (
              <p className="text-xs text-red-600">
                You&apos;re {formatMoney(Math.abs(savingsStatus.difference))} behind schedule.
              </p>
            )}
          </div>

          {/* Expanded section */}
          {expanded && (
            <div className="pt-4 border-t space-y-4">
              {/* Dynamic contribution explanation */}
              {savingsStatus.status !== 'completed' && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                  <p>
                    <strong>Flexible savings:</strong> The recommended amount adjusts automatically based on your progress.
                    Contribute more this month, and next month&apos;s recommendation decreases.
                  </p>
                </div>
              )}

              {/* Quick contribute */}
              {savingsStatus.status !== 'completed' && (
                <>
                  {contributing ? (
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-muted-foreground">$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={contributionAmount}
                          onChange={(e) => setContributionAmount(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <Button onClick={handleContribute} disabled={pending || !contributionAmount}>
                        {pending ? 'Adding...' : 'Add'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setContributing(false)}
                        disabled={pending}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Quick amount buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground self-center">Quick add:</span>
                        {[50, 100, 200, recommendedContribution / 100].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setPending(true);
                              await contributeSavings(goal.id, Math.round(amount * 100));
                              router.refresh();
                              setPending(false);
                            }}
                            disabled={pending}
                          >
                            ${Math.round(amount)}
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setContributing(true)}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Custom Amount
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleDelete}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {savingsStatus.status === 'completed' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
