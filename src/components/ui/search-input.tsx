'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  placeholder?: string;
}

export function SearchInput({ placeholder = 'Search...' }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('search') || '');

  // Update local state when URL changes
  useEffect(() => {
    setValue(searchParams.get('search') || '');
  }, [searchParams]);

  function handleSearch(newValue: string) {
    setValue(newValue);

    const params = new URLSearchParams(searchParams.toString());
    if (newValue) {
      params.set('search', newValue);
    } else {
      params.delete('search');
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleClear() {
    handleSearch('');
  }

  return (
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-8 pr-8 h-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
          onClick={handleClear}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
