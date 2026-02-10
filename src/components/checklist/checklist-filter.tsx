'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface ChecklistFilterProps {
  currentFilter: 'active' | 'complete';
}

export function ChecklistFilter({ currentFilter }: ChecklistFilterProps) {
  return (
    <div className="flex gap-2">
      <FilterButton href="/checklists?filter=active" active={currentFilter === 'active'}>
        Active
      </FilterButton>
      <FilterButton href="/checklists?filter=complete" active={currentFilter === 'complete'}>
        Completed
      </FilterButton>
    </div>
  );
}

function FilterButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
      }`}
    >
      {children}
    </Link>
  );
}
