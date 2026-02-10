import Link from 'next/link';
import { Plus, ListTodo, Calendar, CheckCircle2 } from 'lucide-react';
import { getChecklists } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistFilter } from '@/components/checklist/checklist-filter';
import { DeleteChecklistButton } from '@/components/checklist/delete-checklist-button';

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function ChecklistsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = params.filter as 'active' | 'complete' | undefined;
  const checklists = await getChecklists(filter || 'active');

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Checklists</h1>
        <Button asChild>
          <Link href="/checklists/new">
            <Plus className="h-4 w-4 mr-2" />
            New Checklist
          </Link>
        </Button>
      </div>

      <ChecklistFilter currentFilter={filter || 'active'} />

      {checklists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListTodo className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-medium mb-2">
            {filter === 'complete' ? 'No completed checklists' : 'No active checklists'}
          </h2>
          <p className="mb-4">
            {filter === 'complete'
              ? 'Complete some checklists to see them here'
              : 'Create checklists to track tasks and to-dos'}
          </p>
          {filter !== 'complete' && (
            <Button asChild>
              <Link href="/checklists/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Checklist
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {checklists.map((checklist) => {
            const completedCount = checklist.items.filter(i => i.is_completed).length;
            const totalCount = checklist.items.length;
            const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

            return (
              <Card key={checklist.id} className="hover:bg-muted/50 transition-colors">
                <Link href={`/checklists/${checklist.id}`}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {checklist.is_completed && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <span className="truncate">{checklist.name}</span>
                      </CardTitle>
                      {checklist.event && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="truncate">{checklist.event.title}</span>
                        </div>
                      )}
                    </div>
                    <DeleteChecklistButton checklistId={checklist.id} />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>{completedCount} / {totalCount} items</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {!checklist.event && (
                      <p className="text-xs text-muted-foreground mt-2">Standalone</p>
                    )}
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
