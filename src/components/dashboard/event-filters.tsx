'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DateFilter } from '@/lib/queries';

const FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export function EventFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = (searchParams.get('filter') as DateFilter) || 'week';

  function handleFilterChange(filter: DateFilter) {
    const params = new URLSearchParams(searchParams);
    params.set('filter', filter);
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          onClick={() => handleFilterChange(filter.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            currentFilter === filter.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
