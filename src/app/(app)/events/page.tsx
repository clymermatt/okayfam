import Link from 'next/link';
import { Plus, Calendar, Repeat, TrendingUp, TrendingDown, Receipt, Tag, DollarSign } from 'lucide-react';
import { getEventsWithTransactions, getMonthEventsWithTransactions } from '@/lib/queries';
import { formatDate, formatMoney } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventWithTransaction } from '@/lib/supabase/types';
import { MonthNavigator } from '@/components/budget/month-navigator';
import { EventViewToggle } from '@/components/events/event-view-toggle';
import { EventStatusFilter } from '@/components/events/event-status-filter';
import { EventCategoryFilter } from '@/components/events/event-category-filter';
import { SearchInput } from '@/components/ui/search-input';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; year?: string; month?: string; status?: string; category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();

  const view = params.view || 'all';
  const status = params.status || 'upcoming'; // Default to upcoming events
  const category = params.category || 'all';
  const search = params.search || '';
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  // Fetch events based on view (with linked transaction info)
  const allEvents = view === 'month'
    ? await getMonthEventsWithTransactions(year, month)
    : await getEventsWithTransactions();

  // Filter by status if specified
  let events = status === 'all'
    ? allEvents
    : allEvents.filter(e => e.status === status);

  // Filter by category if specified
  if (category === 'has-category') {
    events = events.filter(e => e.linked_category);
  } else if (category === 'no-category') {
    events = events.filter(e => !e.linked_category);
  }

  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase();
    events = events.filter(e =>
      e.title.toLowerCase().includes(searchLower) ||
      e.description?.toLowerCase().includes(searchLower)
    );
  }

  const upcomingEvents = events.filter(e => e.status === 'upcoming');
  const completedEvents = events.filter(e => e.status === 'completed');
  const cancelledEvents = events.filter(e => e.status === 'cancelled');

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Events</h1>
          <Button asChild>
            <Link href="/events/new">
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Link>
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          <SearchInput placeholder="Search events..." />
          <EventViewToggle currentView={view} />
          <EventStatusFilter currentStatus={status} />
          <EventCategoryFilter currentCategory={category} />
          {view === 'month' && (
            <MonthNavigator year={year} month={month} basePath="/events" />
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-medium mb-2">
            {status !== 'all'
              ? `No ${status} events`
              : view === 'month'
              ? 'No events this month'
              : 'No events yet'}
          </h2>
          <p className="mb-4">
            {status !== 'all'
              ? 'Try changing the filter to see more events'
              : view === 'month'
              ? 'Try viewing all events or navigate to a different month'
              : 'Create your first event to start tracking'}
          </p>
          <Button asChild>
            <Link href="/events/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* When filtered by status, show single list */}
          {status !== 'all' ? (
            <EventSection title={status === 'upcoming' ? 'Upcoming' : 'Completed'} events={events} />
          ) : (
            <>
              {upcomingEvents.length > 0 && (
                <EventSection title="Upcoming" events={upcomingEvents} />
              )}
              {completedEvents.length > 0 && (
                <EventSection title="Completed" events={completedEvents} />
              )}
              {cancelledEvents.length > 0 && (
                <EventSection title="Cancelled" events={cancelledEvents} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EventSection({
  title,
  events,
}: {
  title: string;
  events: EventWithTransaction[];
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{title}</h2>
      <div className="space-y-2">
        {events.map((event) => {
          // Handle null/undefined event_type (default to expense)
          const eventType = event.event_type || 'expense';
          const isIncome = eventType === 'income';
          const isCalendar = eventType === 'calendar';
          const linkedTx = event.linked_transaction;

          // Check if event is overdue (past date but still upcoming)
          const eventDate = new Date(event.event_date);
          eventDate.setHours(0, 0, 0, 0);
          const isOverdue = event.status === 'upcoming' && eventDate < today;

          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className={`block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                isOverdue ? 'border-red-300 bg-red-50/50' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate flex items-center gap-2">
                    {/* Event type icon */}
                    {isIncome ? (
                      <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : isCalendar ? (
                      <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    {event.title}
                    {(event.recurrence || event.recurrence_parent_id) && (
                      <Repeat className="h-3 w-3 text-muted-foreground" />
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground ml-6">
                    {formatDate(event.event_date)}
                    {event.event_time && ` at ${event.event_time.slice(0, 5)}`}
                  </p>
                  {/* Linked category badge */}
                  {event.linked_category && (
                    <div className="flex items-center gap-1.5 mt-1 ml-6">
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-100 text-blue-700 border-blue-200"
                      >
                        <Tag className="h-3 w-3 mr-0.5" />
                        {event.linked_category.name}
                      </Badge>
                    </div>
                  )}
                  {/* Linked transaction info */}
                  {linkedTx && (
                    <div className="flex items-center gap-1.5 mt-1 ml-6 text-xs text-muted-foreground">
                      <Receipt className="h-3 w-3" />
                      <span className="truncate">
                        {linkedTx.merchant_name || linkedTx.name}
                      </span>
                      <span>·</span>
                      <span>{formatDate(linkedTx.date)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isCalendar && (
                    event.status === 'completed' && event.actual_cost !== null ? (
                      <Badge
                        variant="secondary"
                        className={isIncome ? 'bg-green-100 text-green-700' : ''}
                      >
                        {isIncome && '+'}{formatMoney(event.actual_cost)}
                      </Badge>
                    ) : event.estimated_cost > 0 ? (
                      <Badge
                        variant="outline"
                        className={isIncome ? 'border-green-300 text-green-700' : ''}
                      >
                        {isIncome && '+'}~{formatMoney(event.estimated_cost)}
                      </Badge>
                    ) : null
                  )}
                  <StatusBadge status={event.status} isOverdue={isOverdue} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status, isOverdue = false }: { status: string; isOverdue?: boolean }) {
  if (isOverdue) {
    return <Badge variant="destructive">Overdue</Badge>;
  }

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
