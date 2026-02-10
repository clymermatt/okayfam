'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tag, Check, Search, X, Calendar, List, CalendarDays } from 'lucide-react';
import { MerchantCategoryWithEvent } from '@/lib/supabase/types';

interface EventListFiltersProps {
  totalCount: number;
  categorizedCount: number;
  uncategorizedCount: number;
  categories: MerchantCategoryWithEvent[];
  currentView: string;
  currentStatus: string;
  currentCategory: string;
  currentSearch: string;
  selectedCategoryIds: string[];
}

export function EventListFilters({
  totalCount,
  categorizedCount,
  uncategorizedCount,
  categories,
  currentView,
  currentStatus,
  currentCategory,
  currentSearch,
  selectedCategoryIds,
}: EventListFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`/events?${params.toString()}`);
  }

  function setView(view: 'all' | 'month') {
    if (view === 'all') {
      updateParams({ view: null, year: null, month: null });
    } else {
      updateParams({ view: 'month' });
    }
  }

  function setStatus(status: 'all' | 'upcoming' | 'completed') {
    updateParams({ status: status === 'upcoming' ? null : status });
  }

  function setCategoryFilter(filter: 'all' | 'has-category' | 'no-category') {
    updateParams({
      category: filter === 'all' ? null : filter,
      categories: null // Clear specific category selection
    });
  }

  function toggleCategory(categoryId: string) {
    const newSelected = new Set(selectedCategoryIds);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }

    if (newSelected.size === 0) {
      updateParams({ categories: null });
    } else {
      updateParams({ categories: Array.from(newSelected).join(',') });
    }
  }

  function clearCategories() {
    updateParams({ categories: null });
  }

  function setSearch(search: string) {
    updateParams({ search: search || null });
  }

  // Only show event-type categories
  const eventCategories = categories.filter(c => c.category_type === 'event');

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search events..."
          defaultValue={currentSearch}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 pr-8 h-9"
        />
        {currentSearch && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
            onClick={() => setSearch('')}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* View toggle and Status filter */}
      <div className="flex gap-2 flex-wrap">
        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setView('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentView === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            All
          </button>
          <button
            onClick={() => setView('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentView === 'month'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Month
          </button>
        </div>

        {/* Status filter */}
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
      </div>

      {/* Main category filter buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={currentCategory === 'all' && selectedCategoryIds.length === 0 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('all')}
        >
          All
          <Badge variant="secondary" className="ml-2 bg-background/20">
            {totalCount}
          </Badge>
        </Button>
        <Button
          variant={currentCategory === 'no-category' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('no-category')}
        >
          <Tag className="h-4 w-4 mr-1" />
          Uncategorized
          <Badge variant="secondary" className="ml-2 bg-background/20">
            {uncategorizedCount}
          </Badge>
        </Button>
        <Button
          variant={currentCategory === 'has-category' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('has-category')}
        >
          <Check className="h-4 w-4 mr-1" />
          Categorized
          <Badge variant="secondary" className="ml-2 bg-background/20">
            {categorizedCount}
          </Badge>
        </Button>
      </div>

      {/* Individual category filters */}
      {eventCategories.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          {eventCategories.map((cat) => {
            const isSelected = selectedCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  isSelected
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                <Calendar className="h-3 w-3" />
                {cat.name}
                {isSelected && <Check className="h-3 w-3" />}
              </button>
            );
          })}
          {selectedCategoryIds.length > 0 && (
            <button
              onClick={clearCategories}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
