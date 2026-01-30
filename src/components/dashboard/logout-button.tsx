'use client';

import { logout } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="ghost" size="sm" type="submit">
        <LogOut className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </form>
  );
}
