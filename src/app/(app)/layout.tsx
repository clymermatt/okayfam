import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar, DollarSign, ListTodo, Settings, Home, PiggyBank, CreditCard } from 'lucide-react';
import { getCurrentUser, getFamily } from '@/lib/queries';
import { LogoutButton } from '@/components/dashboard/logout-button';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { Logo } from '@/components/ui/logo';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const family = await getFamily();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {family?.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="container mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar navigation */}
        <nav className="hidden md:flex flex-col w-56 space-y-1">
          <NavLink href="/" icon={<Home className="h-4 w-4" />}>
            Dashboard
          </NavLink>
          <NavLink href="/events" icon={<Calendar className="h-4 w-4" />}>
            Events
          </NavLink>
          <NavLink href="/budget" icon={<DollarSign className="h-4 w-4" />}>
            Budget
          </NavLink>
          <NavLink href="/transactions" icon={<CreditCard className="h-4 w-4" />}>
            Transactions
          </NavLink>
          <NavLink href="/savings" icon={<PiggyBank className="h-4 w-4" />}>
            Savings
          </NavLink>
          <NavLink href="/templates" icon={<ListTodo className="h-4 w-4" />}>
            Templates
          </NavLink>
          <NavLink href="/settings" icon={<Settings className="h-4 w-4" />}>
            Settings
          </NavLink>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
