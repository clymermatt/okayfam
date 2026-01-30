import Link from 'next/link';
import { Plus, Target, PiggyBank } from 'lucide-react';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
import { getSavingsGoals } from '@/lib/queries';
import { formatMoney, formatDate, calculateMonthlyContribution } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SavingsGoalCard } from '@/components/savings/savings-goal-card';
import { AddSavingsGoalForm } from '@/components/savings/add-savings-goal-form';

export default async function SavingsPage() {
  const goals = await getSavingsGoals();

  const totalMonthly = goals.reduce(
    (sum, goal) => sum + calculateMonthlyContribution(goal),
    0
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Savings Goals</h1>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Monthly Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatMoney(totalMonthly)}</p>
          <p className="text-sm text-muted-foreground">
            Total to set aside this month across all goals
          </p>
        </CardContent>
      </Card>

      {/* Add new goal */}
      <AddSavingsGoalForm />

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-medium mb-2">No savings goals yet</h2>
          <p className="mb-4">
            Create a goal to start saving for something special
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Active Goals</h2>
          {goals.map((goal) => (
            <SavingsGoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
