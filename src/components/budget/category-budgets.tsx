'use client';

import { CategoryBudgetStatus } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils';
import { DollarSign } from 'lucide-react';
import Link from 'next/link';

interface CategoryBudgetsProps {
  categories: CategoryBudgetStatus[];
}

export function CategoryBudgets({ categories }: CategoryBudgetsProps) {
  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Variable Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No budget categories yet.{' '}
            <Link href="/settings" className="text-primary underline">
              Create one in Settings
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total overage across all categories
  const totalOverage = categories.reduce((sum, item) => {
    const overage = item.spent > item.budget ? item.spent - item.budget : 0;
    return sum + overage;
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Variable Spending
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalOverage > 0 && (
          <div className="p-3 text-sm bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 font-medium">
              {formatMoney(totalOverage)} over budget
            </p>
          </div>
        )}
        {categories.map((item) => {
          const percentUsed = item.budget > 0 ? (item.spent / item.budget) * 100 : 0;
          const isOverBudget = item.spent > item.budget;
          const isNearBudget = percentUsed >= 80 && !isOverBudget;

          return (
            <div key={item.category.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{item.category.name}</span>
                  <div className="text-xs text-muted-foreground">
                    {item.transactionCount} {item.transactionCount === 1 ? 'transaction' : 'transactions'}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${isOverBudget ? 'text-red-600' : ''}`}>
                    {formatMoney(item.spent)}
                  </span>
                  <span className="text-muted-foreground"> / {formatMoney(item.budget)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOverBudget
                      ? 'bg-red-500'
                      : isNearBudget
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(percentUsed, 100)}%` }}
                />
              </div>

              {/* Remaining */}
              <div className="text-sm text-right">
                {isOverBudget ? (
                  <span className="text-red-600 font-medium">
                    {formatMoney(Math.abs(item.remaining))} over budget
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {formatMoney(item.remaining)} remaining
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
