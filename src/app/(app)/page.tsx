import Link from 'next/link';
import { Plus, Calendar, Repeat, TrendingUp, TrendingDown, PiggyBank, ShoppingCart, Landmark, Tag } from 'lucide-react';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
import { getFilteredEvents, getMoneyStatus, getFamily, getTotalMonthlySavings, getSavingsGoals, getCategoryBudgetStatus, DateFilter } from '@/lib/queries';
import { formatDate, formatMoney } from '@/lib/utils';
import { MoneyStatus } from '@/components/budget/money-status';
import { EventFilters } from '@/components/dashboard/event-filters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = (params.filter as DateFilter) || 'week';

  const now = new Date();
  const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [events, moneyStatus, family, monthlySavings, savingsGoals, categoryBudgets] = await Promise.all([
    getFilteredEvents(filter),
    getMoneyStatus(),
    getFamily(),
    getTotalMonthlySavings(),
    getSavingsGoals(),
    getCategoryBudgetStatus(year, month),
  ]);

  const activeSavingsGoals = savingsGoals.filter(g => g.current_amount < g.target_amount);

  const needsSetup = !family?.monthly_budget && moneyStatus.incomeExpected === 0 && moneyStatus.incomeReceived === 0;

  const hasOverage = categoryBudgets.some(cat => cat.spent > cat.budget);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Welcome / Setup prompt */}
      {needsSetup && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-2">Welcome to OKAYfam!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Set your monthly budget to start tracking your family&apos;s expenses.
            </p>
            <Button asChild size="sm">
              <Link href="/settings">Set up budget</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Page header */}
      <h1 className="text-2xl font-bold">{currentMonthName}</h1>

      {/* 1. Total Available (Money Status) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-muted-foreground" />
              Total Available
            </CardTitle>
            <Link href="/budget" className="text-xs text-muted-foreground hover:text-foreground">
              View details
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <MoneyStatus status={moneyStatus} />
        </CardContent>
      </Card>

      {/* 2. Variable Spending */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              Variable Spending
            </CardTitle>
            <Link href="/settings#categories" className="text-xs text-muted-foreground hover:text-foreground">
              Manage categories
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {categoryBudgets.length > 0 ? (
            <div className="space-y-3">
              {categoryBudgets.map((cat) => {
                const percentage = cat.budget > 0 ? Math.min(100, (cat.spent / cat.budget) * 100) : 0;
                const isOverBudget = cat.spent > cat.budget;
                return (
                  <div key={cat.category.id} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{cat.category.name}</span>
                      <span className={`text-xs ${isOverBudget ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {formatMoney(cat.spent)} / {formatMoney(cat.budget)}
                        {isOverBudget && ' (over)'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {Math.round(percentage)}% used
                    </p>
                  </div>
                );
              })}
              {hasOverage && (
                <p className="text-xs text-red-600 pt-2 border-t">
                  Overage amounts have been deducted from Unallocated funds.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                Track spending categories like groceries, gas, or dining out.
              </p>
              <Link
                href="/settings#categories"
                className="text-sm text-primary hover:underline"
              >
                + Add your first category
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Monthly Savings */}
      {(monthlySavings > 0 || activeSavingsGoals.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-muted-foreground" />
                Monthly Savings
              </CardTitle>
              <Link href="/savings" className="text-xs text-muted-foreground hover:text-foreground">
                View details
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {activeSavingsGoals.length} active goal{activeSavingsGoals.length !== 1 ? 's' : ''}
              </p>
              <span className="font-semibold">{formatMoney(monthlySavings)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Upcoming Events */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Upcoming Events
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button variant="default" size="sm" asChild>
                <Link href="/events/new">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Link>
              </Button>
              <Link href="/events" className="text-xs text-muted-foreground hover:text-foreground">
                View details
              </Link>
            </div>
          </div>
          <EventFilters />
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No upcoming events</p>
              <p className="text-xs">Create your first event to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const eventType = event.event_type || 'expense';
                const isIncome = eventType === 'income';
                const isCalendarEvent = eventType === 'calendar';

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm flex items-center gap-1.5">
                          {isIncome ? (
                            <TrendingUp className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          ) : isCalendarEvent ? (
                            <Calendar className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                          )}
                          <span className="truncate">{event.title}</span>
                          {(event.recurrence || event.recurrence_parent_id) && (
                            <span title="Recurring">
                              <Repeat className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-muted-foreground ml-5 mt-0.5">
                          {formatDate(event.event_date)}
                          {event.event_time && ` at ${event.event_time.slice(0, 5)}`}
                        </p>
                        {event.linked_category && (
                          <div className="ml-5 mt-0.5">
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-100 text-blue-700 border-blue-200"
                            >
                              <Tag className="h-3 w-3 mr-0.5" />
                              {event.linked_category.name}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {!isCalendarEvent && event.estimated_cost > 0 && (
                        <Badge
                          variant="secondary"
                          className={`text-xs shrink-0 ${isIncome ? 'bg-green-100 text-green-700' : ''}`}
                        >
                          {isIncome && '+'}
                          {formatMoney(event.estimated_cost)}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
