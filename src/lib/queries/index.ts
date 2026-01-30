// @ts-nocheck - Supabase types not generated
import { createClient } from '@/lib/supabase/server';
import { Event, EventWithTransaction, Family, FamilyMember, ChecklistItem, ChecklistTemplate, MoneyStatus, SavingsGoal, BankConnection, BankAccount, BankTransaction, BankTransactionWithAccount, BankTransactionWithCategory, MerchantRule, MerchantRuleWithEvent, MerchantCategory, MerchantCategoryWithEvent, Profile } from '@/lib/supabase/types';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data as Profile | null;
}

export async function getFamily(): Promise<Family | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('families')
    .select('*')
    .single();

  return data;
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('family_members')
    .select('*')
    .order('name');

  return data ?? [];
}

export async function getEvents(status?: 'upcoming' | 'completed' | 'cancelled'): Promise<Event[]> {
  const supabase = await createClient();

  let query = supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getEventsWithTransactions(status?: 'upcoming' | 'completed' | 'cancelled'): Promise<EventWithTransaction[]> {
  const supabase = await createClient();

  // First get events
  let query = supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data: events } = await query;
  if (!events || events.length === 0) return [];

  // Get all event IDs
  const eventIds = events.map(e => e.id);

  // Get linked transactions for these events
  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('id, name, merchant_name, date, amount, linked_event_id')
    .in('linked_event_id', eventIds);

  // Get categories that link to these events
  const { data: categories } = await supabase
    .from('merchant_categories')
    .select('*')
    .in('event_id', eventIds);

  // Create a map of event_id -> transaction
  const transactionMap = new Map();
  for (const tx of transactions || []) {
    if (tx.linked_event_id) {
      transactionMap.set(tx.linked_event_id, {
        id: tx.id,
        name: tx.name,
        merchant_name: tx.merchant_name,
        date: tx.date,
        amount: tx.amount,
      });
    }
  }

  // Create a map of event_id -> category
  const categoryMap = new Map();
  for (const cat of categories || []) {
    if (cat.event_id) {
      categoryMap.set(cat.event_id, cat);
    }
  }

  // Combine events with their transactions and categories
  return events.map(event => ({
    ...event,
    linked_transaction: transactionMap.get(event.id) || null,
    linked_category: categoryMap.get(event.id) || null,
  }));
}

export async function getMonthEventsWithTransactions(year: number, month: number): Promise<EventWithTransaction[]> {
  const supabase = await createClient();

  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date');

  if (!events || events.length === 0) return [];

  // Get all event IDs
  const eventIds = events.map(e => e.id);

  // Get linked transactions for these events
  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('id, name, merchant_name, date, amount, linked_event_id')
    .in('linked_event_id', eventIds);

  // Get categories that link to these events
  const { data: categories } = await supabase
    .from('merchant_categories')
    .select('*')
    .in('event_id', eventIds);

  // Create a map of event_id -> transaction
  const transactionMap = new Map();
  for (const tx of transactions || []) {
    if (tx.linked_event_id) {
      transactionMap.set(tx.linked_event_id, {
        id: tx.id,
        name: tx.name,
        merchant_name: tx.merchant_name,
        date: tx.date,
        amount: tx.amount,
      });
    }
  }

  // Create a map of event_id -> category
  const categoryMap = new Map();
  for (const cat of categories || []) {
    if (cat.event_id) {
      categoryMap.set(cat.event_id, cat);
    }
  }

  // Combine events with their transactions and categories
  return events.map(event => ({
    ...event,
    linked_transaction: transactionMap.get(event.id) || null,
    linked_category: categoryMap.get(event.id) || null,
  }));
}

export async function getUpcomingEvents(limit = 5): Promise<Event[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'upcoming')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(limit);

  return data ?? [];
}

export type DateFilter = 'today' | 'week' | 'month';

export async function getFilteredEvents(filter: DateFilter): Promise<Event[]> {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  let endDate: string;

  switch (filter) {
    case 'today':
      endDate = today;
      break;
    case 'week': {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 6); // Next 7 days including today
      endDate = weekEnd.toISOString().split('T')[0];
      break;
    }
    case 'month':
    default: {
      // End of current month
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate = monthEnd.toISOString().split('T')[0];
      break;
    }
  }

  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'upcoming')
    .gte('event_date', today)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true });

  return data ?? [];
}

export async function getEvent(id: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (!event) return null;

  // Get participants
  const { data: participantLinks } = await supabase
    .from('event_participants')
    .select('family_member_id')
    .eq('event_id', id);

  const participantIds = participantLinks?.map(p => p.family_member_id) ?? [];

  let participants: FamilyMember[] = [];
  if (participantIds.length > 0) {
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .in('id', participantIds);
    participants = data ?? [];
  }

  // Get checklist items
  const { data: checklist_items } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('event_id', id)
    .order('sort_order');

  return {
    ...event,
    participants,
    checklist_items: checklist_items ?? [],
  };
}

export async function getMonthEvents(year: number, month: number): Promise<Event[]> {
  const supabase = await createClient();

  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date');

  return data ?? [];
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  spent: number;
  budgetRemaining: number;
}

export interface MoneyStatusWithEvents extends MoneyStatus {
  spentEvents: Event[];
  spokenForEvents: Event[];
  incomeReceivedEvents: Event[];
  incomeExpectedEvents: Event[];
  categorySpending: CategorySpending[];
}

export async function getMoneyStatus(year?: number, month?: number): Promise<MoneyStatusWithEvents> {
  const supabase = await createClient();
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? now.getMonth() + 1;

  const [family, events] = await Promise.all([
    getFamily(),
    getMonthEvents(targetYear, targetMonth),
  ]);

  const budget = family?.monthly_budget ?? 0;

  // Separate expenses and income (exclude calendar events from budget calculations)
  const expenses = events.filter(e => e.event_type === 'expense');
  const incomeEvents = events.filter(e => e.event_type === 'income');

  // Get spent events (completed expense events with actual_cost)
  const spentEvents = expenses.filter(e => e.status === 'completed' && e.actual_cost !== null);
  let spent = spentEvents.reduce((sum, e) => sum + (e.actual_cost ?? 0), 0);

  // Get spoken-for events (upcoming expense events with estimated_cost)
  const spokenForEvents = expenses.filter(e => e.status === 'upcoming');
  let spokenFor = spokenForEvents.reduce((sum, e) => sum + e.estimated_cost, 0);

  // Get income received events (completed income events)
  const incomeReceivedEvents = incomeEvents.filter(e => e.status === 'completed' && e.actual_cost !== null);
  const incomeReceived = incomeReceivedEvents.reduce((sum, e) => sum + (e.actual_cost ?? 0), 0);

  // Get expected income events (upcoming income events)
  const incomeExpectedEvents = incomeEvents.filter(e => e.status === 'upcoming');
  const incomeExpected = incomeExpectedEvents.reduce((sum, e) => sum + e.estimated_cost, 0);

  // === Add variable spending from budget categories ===

  // Get all budget-type categories
  const { data: categories } = await supabase
    .from('merchant_categories')
    .select('*')
    .eq('category_type', 'budget');

  const categorySpending: CategorySpending[] = [];

  if (categories && categories.length > 0) {
    // Get transactions for this month that have a category_id
    const startDate = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const { data: transactions } = await supabase
      .from('bank_transactions')
      .select('category_id, amount')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('is_hidden', false)
      .not('category_id', 'is', null);

    // Sum spending by category
    const spendingByCategory = new Map<string, number>();
    for (const tx of transactions || []) {
      if (tx.category_id) {
        const current = spendingByCategory.get(tx.category_id) || 0;
        spendingByCategory.set(tx.category_id, current + tx.amount);
      }
    }

    // Add category spending to totals
    for (const cat of categories) {
      const catSpent = spendingByCategory.get(cat.id) || 0;
      const catBudget = cat.monthly_budget || 0;
      const remaining = Math.max(0, catBudget - catSpent);

      // Add to spent total
      spent += catSpent;

      // Add remaining budget to spoken-for
      spokenFor += remaining;

      categorySpending.push({
        categoryId: cat.id,
        categoryName: cat.name,
        spent: catSpent,
        budgetRemaining: remaining,
      });
    }
  }

  // Total available = budget + all income (received + expected)
  const totalAvailable = budget + incomeReceived + incomeExpected;
  const unallocated = Math.max(0, totalAvailable - spent - spokenFor);

  return {
    budget,
    spent,
    spokenFor,
    unallocated,
    incomeReceived,
    incomeExpected,
    spentEvents,
    spokenForEvents,
    incomeReceivedEvents,
    incomeExpectedEvents,
    categorySpending,
  };
}

export async function getChecklistTemplates(): Promise<ChecklistTemplate[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('checklist_templates')
    .select('*')
    .order('name');

  return data ?? [];
}

export async function getChecklistTemplate(id: string): Promise<ChecklistTemplate | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('is_completed', false)
    .order('target_date', { ascending: true });

  return data ?? [];
}

export async function getSavingsGoal(id: string): Promise<SavingsGoal | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

import { calculateMonthlyContribution } from '@/lib/utils';

// Get total monthly savings contribution across all active goals
export async function getTotalMonthlySavings(): Promise<number> {
  const goals = await getSavingsGoals();
  return goals.reduce((sum, goal) => sum + calculateMonthlyContribution(goal), 0);
}

// Bank-related queries

export async function getBankConnections(): Promise<BankConnection[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('bank_connections')
    .select('*')
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function getBankConnection(id: string): Promise<BankConnection | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('id', id)
    .single();

  return data;
}

export async function getBankAccounts(connectionId?: string): Promise<BankAccount[]> {
  const supabase = await createClient();

  let query = supabase
    .from('bank_accounts')
    .select('*')
    .order('name');

  if (connectionId) {
    query = query.eq('connection_id', connectionId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getBankTransactions(options?: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
  includeHidden?: boolean;
  unlinkedOnly?: boolean;
  limit?: number;
}): Promise<BankTransactionWithAccount[]> {
  const supabase = await createClient();

  let query = supabase
    .from('bank_transactions')
    .select(`
      *,
      account:bank_accounts(*)
    `)
    .order('date', { ascending: false });

  if (options?.accountId) {
    query = query.eq('account_id', options.accountId);
  }

  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }

  if (!options?.includeHidden) {
    query = query.eq('is_hidden', false);
  }

  if (options?.unlinkedOnly) {
    query = query.is('linked_event_id', null);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data } = await query;
  return (data ?? []) as BankTransactionWithAccount[];
}

export async function getRecentTransactions(limit = 10): Promise<BankTransactionWithAccount[]> {
  return getBankTransactions({ limit, includeHidden: false });
}

export async function getUnlinkedTransactions(): Promise<BankTransactionWithAccount[]> {
  return getBankTransactions({ unlinkedOnly: true, includeHidden: false });
}

export async function getMonthTransactions(year: number, month: number): Promise<BankTransactionWithCategory[]> {
  const supabase = await createClient();
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data } = await supabase
    .from('bank_transactions')
    .select(`
      *,
      account:bank_accounts(*),
      merchant_category:merchant_categories(*)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('is_hidden', false)
    .order('date', { ascending: false });

  return (data ?? []) as BankTransactionWithCategory[];
}

export async function getMatchingTransactions(event: {
  event_date: string;
  estimated_cost: number;
}): Promise<BankTransactionWithAccount[]> {
  const supabase = await createClient();

  // Look for transactions within 3 days of the event date with similar amounts
  const eventDate = new Date(event.event_date);
  const startDate = new Date(eventDate);
  startDate.setDate(startDate.getDate() - 3);
  const endDate = new Date(eventDate);
  endDate.setDate(endDate.getDate() + 3);

  const minAmount = Math.round(event.estimated_cost * 0.8); // 20% tolerance
  const maxAmount = Math.round(event.estimated_cost * 1.2);

  const { data } = await supabase
    .from('bank_transactions')
    .select(`
      *,
      account:bank_accounts(*)
    `)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .gte('amount', minAmount)
    .lte('amount', maxAmount)
    .is('linked_event_id', null)
    .eq('is_hidden', false)
    .order('date', { ascending: false });

  return (data ?? []) as BankTransactionWithAccount[];
}

// Merchant rules queries

export async function getMerchantRules(): Promise<MerchantRuleWithEvent[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('merchant_rules')
    .select(`
      *,
      event:events(*)
    `)
    .order('keyword');

  return (data ?? []) as MerchantRuleWithEvent[];
}

export async function getMerchantCategories(): Promise<MerchantCategoryWithEvent[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('merchant_categories')
    .select(`
      *,
      event:events(*)
    `)
    .order('name');

  return (data ?? []) as MerchantCategoryWithEvent[];
}

export interface CategoryBudgetStatus {
  category: MerchantCategory;
  budget: number;
  spent: number;
  remaining: number;
  transactionCount: number;
}

export async function getCategoryBudgetStatus(year: number, month: number): Promise<CategoryBudgetStatus[]> {
  const supabase = await createClient();

  // Get all budget-type categories
  const { data: categories } = await supabase
    .from('merchant_categories')
    .select('*')
    .eq('category_type', 'budget');

  if (!categories || categories.length === 0) return [];

  // Get transactions for this month that have a category_id
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('category_id, amount')
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('is_hidden', false)
    .not('category_id', 'is', null);

  // Sum spending by category
  const spendingByCategory = new Map<string, { spent: number; count: number }>();
  for (const tx of transactions || []) {
    if (tx.category_id) {
      const current = spendingByCategory.get(tx.category_id) || { spent: 0, count: 0 };
      current.spent += tx.amount;
      current.count += 1;
      spendingByCategory.set(tx.category_id, current);
    }
  }

  // Build result
  return categories.map(cat => {
    const spending = spendingByCategory.get(cat.id) || { spent: 0, count: 0 };
    const budget = cat.monthly_budget || 0;
    return {
      category: cat as MerchantCategory,
      budget,
      spent: spending.spent,
      remaining: budget - spending.spent,
      transactionCount: spending.count,
    };
  }).sort((a, b) => a.category.name.localeCompare(b.category.name));
}

export async function getRecurringEvents(): Promise<Event[]> {
  const supabase = await createClient();

  // Get events that are recurring (good candidates for keyword rules)
  const { data } = await supabase
    .from('events')
    .select('*')
    .not('recurrence', 'is', null)
    .eq('status', 'upcoming')
    .order('title');

  return data ?? [];
}

export interface MerchantSuggestion {
  keyword: string;
  count: number;
  totalAmount: number;
  transactions: { name: string; amount: number; date: string }[];
}

export async function getMerchantSuggestions(): Promise<MerchantSuggestion[]> {
  const supabase = await createClient();

  // Get all unlinked transactions
  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('name, merchant_name, amount, date')
    .is('linked_event_id', null)
    .eq('is_hidden', false)
    .order('date', { ascending: false });

  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Get existing rules to exclude those keywords
  const { data: existingRules } = await supabase
    .from('merchant_rules')
    .select('keyword');

  const existingKeywords = new Set(
    (existingRules ?? []).map(r => r.keyword.toLowerCase())
  );

  // Group by merchant name and count occurrences
  const merchantCounts = new Map<string, { count: number; totalAmount: number; transactions: { name: string; amount: number; date: string }[] }>();

  for (const tx of transactions) {
    // Use merchant_name if available, otherwise extract from name
    let merchant = tx.merchant_name || tx.name;

    // Clean up the merchant name - extract key identifying part
    merchant = merchant
      .replace(/\d{2,}/g, '') // Remove long numbers
      .replace(/[#*]/g, '')   // Remove special chars
      .trim()
      .toUpperCase();

    // Skip if too short or already has a rule
    if (merchant.length < 3 || existingKeywords.has(merchant.toLowerCase())) {
      continue;
    }

    const existing = merchantCounts.get(merchant) || { count: 0, totalAmount: 0, transactions: [] };
    existing.count++;
    existing.totalAmount += tx.amount;
    if (existing.transactions.length < 5) {
      existing.transactions.push({ name: tx.name, amount: tx.amount, date: tx.date });
    }
    merchantCounts.set(merchant, existing);
  }

  // Convert to array and sort by count (most frequent first)
  const suggestions: MerchantSuggestion[] = [];
  for (const [keyword, data] of merchantCounts) {
    // Only suggest merchants that appear more than once
    if (data.count >= 2) {
      suggestions.push({
        keyword,
        count: data.count,
        totalAmount: data.totalAmount,
        transactions: data.transactions,
      });
    }
  }

  return suggestions.sort((a, b) => b.count - a.count).slice(0, 10);
}
