'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoneyStatusWithEvents, CategorySpending } from '@/lib/queries';
import { formatMoney, formatDate } from '@/lib/utils';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Event } from '@/lib/supabase/types';

interface MoneyStatusProps {
  status: MoneyStatusWithEvents;
  monthlySavings?: number;
}

export function MoneyStatus({ status, monthlySavings = 0 }: MoneyStatusProps) {
  const {
    budget,
    spent,
    spokenFor,
    incomeReceived,
    incomeExpected,
    spentEvents,
    spokenForEvents,
    categorySpending,
  } = status;

  const [expandedSection, setExpandedSection] = useState<'spent' | 'spokenFor' | null>(null);

  // Check if there's category data to show
  const hasSpentCategories = categorySpending.some(c => c.spent > 0);
  const hasRemainingCategories = categorySpending.some(c => c.budgetRemaining > 0);

  // Create a map of category budgets for overage display
  const categoryBudgets = new Map(
    categorySpending.map(c => [c.categoryId, c.spent + c.budgetRemaining])
  );

  const totalIncome = incomeReceived + incomeExpected;
  const totalAvailable = budget + totalIncome;

  // Calculate unallocated (subtract savings from available funds)
  const unallocated = Math.max(0, totalAvailable - spent - spokenFor - monthlySavings);

  // Calculate percentages for the bar based on total available
  const total = totalAvailable || 1; // Avoid division by zero
  const spentPercent = Math.min((spent / total) * 100, 100);
  const spokenForPercent = Math.min((spokenFor / total) * 100, 100 - spentPercent);
  const savingsPercent = Math.min((monthlySavings / total) * 100, 100 - spentPercent - spokenForPercent);
  const unallocatedPercent = Math.max(0, 100 - spentPercent - spokenForPercent - savingsPercent);

  function toggleSection(section: 'spent' | 'spokenFor') {
    setExpandedSection(expandedSection === section ? null : section);
  }

  return (
    <div className="space-y-4">
      {/* Total amount and budget info */}
      <div className="flex justify-between items-start">
        <div className="text-sm text-muted-foreground space-y-1">
          {totalIncome > 0 && (
            <p className="text-green-600">
              +{formatMoney(incomeReceived)} received
              {incomeExpected > 0 && ` / +${formatMoney(incomeExpected)} expected`}
            </p>
          )}
          {budget === 0 && totalIncome === 0 && (
            <p>Set a base budget or add income events</p>
          )}
        </div>
        <span className="text-2xl font-semibold">{formatMoney(totalAvailable)}</span>
      </div>

      {/* Income summary if there is income */}
      {totalIncome > 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-md text-green-700">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm">
            Income: {formatMoney(incomeReceived)} received
            {incomeExpected > 0 && ` + ${formatMoney(incomeExpected)} expected`}
          </span>
        </div>
      )}

        {/* Budget bar */}
        <div className="h-6 rounded-full bg-muted overflow-hidden flex">
          {spentPercent > 0 && (
            <div
              className="bg-red-500 h-full transition-all"
              style={{ width: `${spentPercent}%` }}
            />
          )}
          {spokenForPercent > 0 && (
            <div
              className="bg-yellow-500 h-full transition-all"
              style={{ width: `${spokenForPercent}%` }}
            />
          )}
          {savingsPercent > 0 && (
            <div
              className="bg-blue-500 h-full transition-all"
              style={{ width: `${savingsPercent}%` }}
            />
          )}
          {unallocatedPercent > 0 && (
            <div
              className="bg-green-500 h-full transition-all"
              style={{ width: `${unallocatedPercent}%` }}
            />
          )}
        </div>

        {/* Legend - clickable for spent and spoken-for */}
        <div className={`grid gap-2 sm:gap-4 text-center ${monthlySavings > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {/* Spent - clickable */}
          <button
            onClick={() => (spentEvents.length > 0 || hasSpentCategories) && toggleSection('spent')}
            className={`text-center ${(spentEvents.length > 0 || hasSpentCategories) ? 'cursor-pointer hover:bg-muted/50 rounded-md p-1 sm:p-2 -m-1 sm:-m-2 transition-colors' : ''}`}
            disabled={spentEvents.length === 0 && !hasSpentCategories}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">Spent</span>
              {(spentEvents.length > 0 || hasSpentCategories) && (
                expandedSection === 'spent' ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold">{formatMoney(spent)}</p>
          </button>

          {/* Spoken-for - clickable */}
          <button
            onClick={() => (spokenForEvents.length > 0 || hasRemainingCategories) && toggleSection('spokenFor')}
            className={`text-center ${(spokenForEvents.length > 0 || hasRemainingCategories) ? 'cursor-pointer hover:bg-muted/50 rounded-md p-1 sm:p-2 -m-1 sm:-m-2 transition-colors' : ''}`}
            disabled={spokenForEvents.length === 0 && !hasRemainingCategories}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">Planned</span>
              {(spokenForEvents.length > 0 || hasRemainingCategories) && (
                expandedSection === 'spokenFor' ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold">{formatMoney(spokenFor)}</p>
          </button>

          {monthlySavings > 0 && (
            <div>
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-muted-foreground">Savings</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold">{formatMoney(monthlySavings)}</p>
            </div>
          )}

          {/* Unallocated - not clickable */}
          <div>
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">Free</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold">{formatMoney(unallocated)}</p>
          </div>
        </div>

        {/* Expanded itemized list */}
        {expandedSection === 'spent' && (
          <div className="space-y-3">
            {spentEvents.length > 0 && (
              <EventList
                events={spentEvents}
                title="Completed Events"
                color="red"
                showActualCost
              />
            )}
            {hasSpentCategories && (
              <CategoryList
                categories={categorySpending.filter(c => c.spent > 0)}
                title="Variable Spending"
                color="red"
                showSpent
                budgets={categoryBudgets}
              />
            )}
          </div>
        )}

        {expandedSection === 'spokenFor' && (
          <div className="space-y-3">
            {spokenForEvents.length > 0 && (
              <EventList
                events={spokenForEvents}
                title="Upcoming Events"
                color="yellow"
              />
            )}
            {hasRemainingCategories && (
              <CategoryList
                categories={categorySpending.filter(c => c.budgetRemaining > 0)}
                title="Budget Remaining"
                color="yellow"
                showRemaining
              />
            )}
          </div>
        )}

      {/* Warning if over budget */}
      {spent + spokenFor > totalAvailable && totalAvailable > 0 && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          Over budget by {formatMoney(spent + spokenFor - totalAvailable)}
        </div>
      )}
    </div>
  );
}

function EventList({
  events,
  title,
  color,
  showActualCost = false,
}: {
  events: Event[];
  title: string;
  color: 'red' | 'yellow';
  showActualCost?: boolean;
}) {
  const colorClasses = {
    red: 'border-red-200 bg-red-50/50',
    yellow: 'border-yellow-200 bg-yellow-50/50',
  };

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color]}`}>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
      <ul className="space-y-2">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="flex justify-between items-center hover:bg-background/50 rounded px-2 py-1 -mx-2 transition-colors"
            >
              <div>
                <span className="font-medium">{event.title}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {formatDate(event.event_date)}
                </span>
              </div>
              <span className="font-medium">
                {formatMoney(showActualCost ? (event.actual_cost ?? 0) : event.estimated_cost)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryList({
  categories,
  title,
  color,
  showSpent = false,
  showRemaining = false,
  budgets,
}: {
  categories: CategorySpending[];
  title: string;
  color: 'red' | 'yellow';
  showSpent?: boolean;
  showRemaining?: boolean;
  budgets?: Map<string, number>;
}) {
  const colorClasses = {
    red: 'border-red-200 bg-red-50/50',
    yellow: 'border-yellow-200 bg-yellow-50/50',
  };

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color]}`}>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>
      <ul className="space-y-2">
        {categories.map((cat) => {
          const budget = budgets?.get(cat.categoryId) || 0;
          const isOverBudget = showSpent && budget > 0 && cat.spent > budget;
          const overage = isOverBudget ? cat.spent - budget : 0;

          return (
            <li key={cat.categoryId}>
              <Link
                href="/transactions"
                className="flex justify-between items-start hover:bg-background/50 rounded px-2 py-1 -mx-2 transition-colors"
              >
                <div>
                  <span className="font-medium">{cat.categoryName}</span>
                  {isOverBudget && (
                    <p className="text-xs text-red-600">
                      {formatMoney(overage)} over budget (from Unallocated)
                    </p>
                  )}
                </div>
                <span className="font-medium">
                  {showSpent && formatMoney(cat.spent)}
                  {showRemaining && formatMoney(cat.budgetRemaining)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

