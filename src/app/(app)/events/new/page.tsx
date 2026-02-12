import { getFamilyMembers, getSavingsGoals } from '@/lib/queries';
import { EventForm } from '@/components/events/event-form';

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ savings_goal?: string }>;
}) {
  const params = await searchParams;
  const [familyMembers, savingsGoals] = await Promise.all([
    getFamilyMembers(),
    getSavingsGoals(),
  ]);

  // Pre-select savings goal if provided in URL
  const defaultSavingsGoalId = params.savings_goal || undefined;

  return (
    <div className="max-w-2xl pb-20 md:pb-0">
      <h1 className="text-2xl font-bold mb-6">Create Event</h1>
      <EventForm
        familyMembers={familyMembers}
        savingsGoals={savingsGoals}
        defaultSavingsGoalId={defaultSavingsGoalId}
      />
    </div>
  );
}
