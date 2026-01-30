'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface EventStatusFilterProps {
  currentStatus: string;
}

export function EventStatusFilter({ currentStatus }: EventStatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setStatus(status: 'all' | 'upcoming' | 'completed') {
    const params = new URLSearchParams(searchParams);
    // 'upcoming' is the default, so we can remove the param when it's selected
    if (status === 'upcoming') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    router.push(`/events?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      <button
        onClick={() => setStatus('all')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentStatus === 'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        All
      </button>
      <button
        onClick={() => setStatus('upcoming')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentStatus === 'upcoming'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Upcoming
      </button>
      <button
        onClick={() => setStatus('completed')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentStatus === 'completed'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Completed
      </button>
    </div>
  );
}
