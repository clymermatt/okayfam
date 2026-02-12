import { notFound } from 'next/navigation';
import { getEvent, getFamilyMembers, getSavingsGoals } from '@/lib/queries';
import { EventForm } from '@/components/events/event-form';

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, familyMembers, savingsGoals] = await Promise.all([
    getEvent(id),
    getFamilyMembers(),
    getSavingsGoals(),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-2xl pb-20 md:pb-0">
      <h1 className="text-2xl font-bold mb-6">Edit Event</h1>
      <EventForm
        event={event}
        familyMembers={familyMembers}
        savingsGoals={savingsGoals}
        participantIds={event.participants.map((p: { id: string }) => p.id)}
      />
    </div>
  );
}
