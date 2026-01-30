import Link from 'next/link';
import { Settings, Landmark } from 'lucide-react';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
import { getMoneyStatus, getFamily, getTotalMonthlySavings, getCategoryBudgetStatus } from '@/lib/queries';
import { MoneyStatus } from '@/components/budget/money-status';
import { MonthNavigator } from '@/components/budget/month-navigator';
import { CategoryBudgets } from '@/components/budget/category-budgets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();

  // Parse year and month from URL params, default to current
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  const [moneyStatus, family, monthlySavings, categoryBudgets] = await Promise.all([
    getMoneyStatus(year, month),
    getFamily(),
    getTotalMonthlySavings(),
    getCategoryBudgetStatus(year, month),
  ]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <MonthNavigator year={year} month={month} />
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">
            <Settings className="h-4 w-4 mr-2" />
            Edit Budget
          </Link>
        </Button>
      </div>

      {/* Money Status with expandable itemized lists */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Landmark className="h-5 w-5 text-muted-foreground" />
            Total Available
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MoneyStatus status={moneyStatus} monthlySavings={monthlySavings} />
        </CardContent>
      </Card>

      {/* Variable Spending (Budget Categories) */}
      <CategoryBudgets categories={categoryBudgets} />

      {/* Tip about clicking categories */}
      <p className="text-sm text-muted-foreground text-center">
        Click on Spent or Spoken-for to see itemized details
      </p>
    </div>
  );
}
