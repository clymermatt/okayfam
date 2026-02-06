import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function parseMoney(dollars: string): number {
  const cleaned = dollars.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function formatDate(date: Date | string): string {
  // Parse date string as local time to avoid timezone shift
  let d: Date;
  if (typeof date === "string") {
    // For date-only strings like "2026-02-01", parse as local date
    const parts = date.split('T')[0].split('-');
    d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    d = date;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  // Parse date string as local time to avoid timezone shift
  let d: Date;
  if (typeof date === "string") {
    if (date.includes('T')) {
      // Has time component, use as-is
      d = new Date(date);
    } else {
      // Date-only string, parse as local
      const parts = date.split('-');
      d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  } else {
    d = date;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function getMonthRange(date: Date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

// Calculate monthly contribution needed for a savings goal
export function calculateMonthlyContribution(goal: {
  target_amount: number;
  current_amount: number;
  target_date: string;
}): number {
  const remaining = goal.target_amount - goal.current_amount;
  if (remaining <= 0) return 0;

  const now = new Date();
  const target = new Date(goal.target_date);

  // Calculate months remaining (at least 1)
  const monthsRemaining = Math.max(1,
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth())
  );

  return Math.ceil(remaining / monthsRemaining);
}

// Calculate savings goal progress status
export function calculateSavingsStatus(goal: {
  target_amount: number;
  current_amount: number;
  target_date: string;
  created_at: string;
}): {
  status: 'ahead' | 'on-track' | 'behind' | 'completed';
  expectedAmount: number;
  difference: number;
  monthsRemaining: number;
} {
  if (goal.current_amount >= goal.target_amount) {
    return {
      status: 'completed',
      expectedAmount: goal.target_amount,
      difference: goal.current_amount - goal.target_amount,
      monthsRemaining: 0,
    };
  }

  const now = new Date();
  const target = new Date(goal.target_date);
  const created = new Date(goal.created_at);

  // Total months from creation to target
  const totalMonths = Math.max(1,
    (target.getFullYear() - created.getFullYear()) * 12 +
    (target.getMonth() - created.getMonth())
  );

  // Months elapsed since creation
  const monthsElapsed = Math.max(0,
    (now.getFullYear() - created.getFullYear()) * 12 +
    (now.getMonth() - created.getMonth())
  );

  // Months remaining
  const monthsRemaining = Math.max(1,
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth())
  );

  // Expected amount by now (linear progress)
  const expectedAmount = Math.round(
    (goal.target_amount / totalMonths) * monthsElapsed
  );

  const difference = goal.current_amount - expectedAmount;

  // Determine status with a small tolerance (5% of target)
  const tolerance = goal.target_amount * 0.05;
  let status: 'ahead' | 'on-track' | 'behind';

  if (difference > tolerance) {
    status = 'ahead';
  } else if (difference < -tolerance) {
    status = 'behind';
  } else {
    status = 'on-track';
  }

  return {
    status,
    expectedAmount,
    difference,
    monthsRemaining,
  };
}
