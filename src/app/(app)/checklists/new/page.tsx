import { getEventsForLinking } from '@/lib/queries';
import { ChecklistForm } from '@/components/checklist/checklist-form';

interface PageProps {
  searchParams: Promise<{ event?: string }>;
}

export default async function NewChecklistPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preselectedEventId = params.event;
  const events = await getEventsForLinking();

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold">Create Checklist</h1>
      <ChecklistForm events={events} preselectedEventId={preselectedEventId} />
    </div>
  );
}
