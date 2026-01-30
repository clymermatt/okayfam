'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { List, CalendarDays } from 'lucide-react';

interface EventViewToggleProps {
  currentView: string;
}

export function EventViewToggle({ currentView }: EventViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setView(view: 'all' | 'month') {
    const params = new URLSearchParams(searchParams);
    if (view === 'all') {
      params.delete('view');
      params.delete('year');
      params.delete('month');
    } else {
      params.set('view', 'month');
    }
    router.push(`/events?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      <button
        onClick={() => setView('all')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentView === 'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <List className="h-4 w-4" />
        All Events
      </button>
      <button
        onClick={() => setView('month')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentView === 'month'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        By Month
      </button>
    </div>
  );
}
