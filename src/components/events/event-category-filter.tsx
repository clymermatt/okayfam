'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Tag } from 'lucide-react';

interface EventCategoryFilterProps {
  currentCategory: string;
}

export function EventCategoryFilter({ currentCategory }: EventCategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setCategory(category: 'all' | 'has-category' | 'no-category') {
    const params = new URLSearchParams(searchParams);
    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.push(`/events?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      <button
        onClick={() => setCategory('all')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentCategory === 'all'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        All
      </button>
      <button
        onClick={() => setCategory('has-category')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
          currentCategory === 'has-category'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Tag className="h-3 w-3" />
        Categorized
      </button>
      <button
        onClick={() => setCategory('no-category')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentCategory === 'no-category'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        No Category
      </button>
    </div>
  );
}
