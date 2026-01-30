'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, DollarSign, Settings, Home, PiggyBank, CreditCard } from 'lucide-react';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/events', icon: Calendar, label: 'Events' },
  { href: '/budget', icon: DollarSign, label: 'Budget' },
  { href: '/transactions', icon: CreditCard, label: 'Transactions' },
  { href: '/savings', icon: PiggyBank, label: 'Savings' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t safe-area-bottom">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
