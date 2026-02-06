import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Trash2, Check, X, Repeat, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { getEvent, getChecklistTemplates, getMatchingTransactions } from '@/lib/queries';
import type { FamilyMember } from '@/lib/supabase/types';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteEventButton } from '@/components/events/delete-event-button';
import { CompleteEventForm } from '@/components/events/complete-event-form';
import { CancelEventButton } from '@/components/events/cancel-event-button';
import { MarkCalendarEventComplete } from '@/components/events/mark-calendar-complete';
import { EventChecklist } from '@/components/checklist/event-checklist';
import { UnlinkTransactionButton } from '@/components/events/unlink-transaction-button';

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, templates] = await Promise.all([
    getEvent(id),
    getChecklistTemplates(),
  ]);

  if (!event) {
    notFound();
  }

  const isUpcoming = event.status === 'upcoming';
  const isCompleted = event.status === 'completed';
  const isRecurring = !!event.recurrence || !!event.recurrence_parent_id;
  const isParentEvent = !!event.recurrence && !event.recurrence_parent_id;
  const isIncome = event.event_type === 'income';
  const isCalendarOnly = event.event_type === 'calendar';

  // Fetch matching transactions for upcoming expense events
  const matchingTransactions = isUpcoming && !isCalendarOnly && !isIncome
    ? await getMatchingTransactions({
        event_date: event.event_date,
        estimated_cost: event.estimated_cost,
      })
    : [];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">
            {formatDate(event.event_date)}
            {event.event_time && ` at ${event.event_time.slice(0, 5)}`}
          </p>
          {isRecurring && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Repeat className="h-3 w-3" />
              {event.recurrence
                ? RECURRENCE_LABELS[event.recurrence]
                : 'Part of recurring series'}
            </p>
          )}
        </div>
        <StatusBadge status={event.status} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isUpcoming && (
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/events/${id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <CancelEventButton eventId={id} />
          </>
        )}
        <DeleteEventButton eventId={id} isParentEvent={isParentEvent} />
      </div>

      {/* Event details card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {event.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Description
              </h3>
              <p>{event.description}</p>
            </div>
          )}

          {/* Event type indicator */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
            isIncome
              ? 'bg-green-50 text-green-700'
              : isCalendarOnly
              ? 'bg-blue-50 text-blue-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {isIncome ? (
              <><TrendingUp className="h-4 w-4" /> Income</>
            ) : isCalendarOnly ? (
              <><Calendar className="h-4 w-4" /> Calendar Event</>
            ) : (
              <><TrendingDown className="h-4 w-4" /> Expense</>
            )}
          </div>

          {/* Cost display - hidden for calendar events */}
          {!isCalendarOnly && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {isIncome ? 'Expected Amount' : 'Estimated Cost'}
                </h3>
                <p className={`text-lg font-semibold ${isIncome ? 'text-green-600' : ''}`}>
                  {isIncome && '+'}{formatMoney(event.estimated_cost)}
                </p>
              </div>
              {isCompleted && event.actual_cost !== null && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {isIncome ? 'Actual Amount' : 'Actual Cost'}
                  </h3>
                  <p className={`text-lg font-semibold ${isIncome ? 'text-green-600' : ''}`}>
                    {isIncome && '+'}{formatMoney(event.actual_cost)}
                  </p>
                </div>
              )}
            </div>
          )}

          {event.participants.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Participants
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.participants.map((member: FamilyMember) => (
                  <Badge key={member.id} variant="outline">
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: member.color }}
                    />
                    {member.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete event form (only for upcoming expense/income events) */}
      {isUpcoming && !isCalendarOnly && (
        <CompleteEventForm
          eventId={id}
          estimatedCost={event.estimated_cost}
          isIncome={isIncome}
          matchingTransactions={matchingTransactions}
        />
      )}

      {/* Simple complete button for calendar events */}
      {isUpcoming && isCalendarOnly && (
        <MarkCalendarEventComplete eventId={id} />
      )}

      {/* Linked transaction info for completed events */}
      {isCompleted && event.linkedTransaction && (
        <UnlinkTransactionButton
          eventId={id}
          transaction={event.linkedTransaction}
        />
      )}

      {/* Checklist */}
      <EventChecklist
        eventId={id}
        items={event.checklist_items}
        templates={templates}
        readonly={!isUpcoming}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'upcoming':
      return <Badge variant="default">Upcoming</Badge>;
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'cancelled':
      return <Badge variant="secondary">Cancelled</Badge>;
    default:
      return null;
  }
}
