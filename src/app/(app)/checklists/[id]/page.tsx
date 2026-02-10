import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, CheckCircle2, Link2, Link2Off } from 'lucide-react';
import { getChecklist, getEventsForLinking, getUnlinkedChecklists } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistItems } from '@/components/checklist/checklist-items';
import { ChecklistNameForm } from '@/components/checklist/checklist-name-form';
import { LinkEventDialog } from '@/components/checklist/link-event-dialog';
import { UnlinkEventButton } from '@/components/checklist/unlink-event-button';
import { ToggleCompleteButton } from '@/components/checklist/toggle-complete-button';
import { DeleteChecklistButton } from '@/components/checklist/delete-checklist-button';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChecklistDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [checklist, events] = await Promise.all([
    getChecklist(id),
    getEventsForLinking(),
  ]);

  if (!checklist) {
    notFound();
  }

  const completedCount = checklist.items.filter(i => i.is_completed).length;
  const totalCount = checklist.items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isStandalone = !checklist.event_id;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/checklists">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <ChecklistNameForm checklist={checklist} />
        </div>
        <DeleteChecklistButton checklistId={checklist.id} variant="outline" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {checklist.is_completed && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              <CardTitle className="text-base">
                {checklist.is_completed ? 'Completed' : 'In Progress'}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{completedCount} / {totalCount}</span>
              <span>({Math.round(progress)}%)</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {checklist.event ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/events/${checklist.event.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Calendar className="h-4 w-4" />
                  {checklist.event.title}
                </Link>
                <UnlinkEventButton checklistId={checklist.id} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Standalone checklist</span>
                <LinkEventDialog checklistId={checklist.id} events={events} />
              </div>
            )}

            {isStandalone && !checklist.is_completed && totalCount > 0 && (
              <ToggleCompleteButton
                checklistId={checklist.id}
                isCompleted={false}
                disabled={completedCount < totalCount}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ChecklistItems
            checklistId={checklist.id}
            items={checklist.items}
            readonly={checklist.is_completed}
          />
        </CardContent>
      </Card>
    </div>
  );
}
