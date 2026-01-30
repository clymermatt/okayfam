'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthNavigatorProps {
  year: number;
  month: number;
  basePath?: string;
}

export function MonthNavigator({ year, month, basePath = '/budget' }: MonthNavigatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isCurrentMonth = year === currentYear && month === currentMonth;

  function navigate(direction: 'prev' | 'next') {
    let newYear = year;
    let newMonth = month;

    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }

    // Preserve other search params (like view=month for events page)
    const params = new URLSearchParams(searchParams);
    params.set('year', newYear.toString());
    params.set('month', newMonth.toString());
    router.push(`${basePath}?${params.toString()}`);
  }

  function goToToday() {
    // Preserve view param if present
    const params = new URLSearchParams();
    const view = searchParams.get('view');
    if (view) params.set('view', view);
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigate('prev')}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-[160px] text-center">
        <span className="font-semibold">{monthName}</span>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => navigate('next')}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="ml-2"
        >
          Today
        </Button>
      )}
    </div>
  );
}
