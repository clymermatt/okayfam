import { getFamilyMembers } from '@/lib/queries';
import { EventForm } from '@/components/events/event-form';

export default async function NewEventPage() {
  const familyMembers = await getFamilyMembers();

  return (
    <div className="max-w-2xl pb-20 md:pb-0">
      <h1 className="text-2xl font-bold mb-6">Create Event</h1>
      <EventForm familyMembers={familyMembers} />
    </div>
  );
}
