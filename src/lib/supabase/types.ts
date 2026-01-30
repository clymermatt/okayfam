export type EventStatus = 'upcoming' | 'completed' | 'cancelled';
export type RecurrenceType = 'weekly' | 'biweekly' | 'monthly' | 'yearly' | null;
export type EventType = 'expense' | 'income' | 'calendar';

export interface Family {
  id: string;
  name: string;
  monthly_budget: number; // in cents
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  family_id: string | null;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Event {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  estimated_cost: number; // in cents
  actual_cost: number | null; // in cents
  status: EventStatus;
  event_type: EventType;
  recurrence: RecurrenceType;
  recurrence_end_date: string | null;
  recurrence_parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventWithParticipants extends Event {
  participants: FamilyMember[];
  checklist_items: ChecklistItem[];
}

export interface LinkedTransaction {
  id: string;
  name: string;
  merchant_name: string | null;
  date: string;
  amount: number;
}

export interface EventWithTransaction extends Event {
  linked_transaction?: LinkedTransaction | null;
  linked_category?: MerchantCategory | null;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  family_member_id: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  event_id: string;
  family_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: string;
  family_id: string;
  name: string;
  items: { title: string }[];
  created_at: string;
  updated_at: string;
}

export interface BudgetPeriod {
  id: string;
  family_id: string;
  year: number;
  month: number;
  budget: number; // in cents
  notes: string | null;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  family_id: string;
  name: string;
  target_amount: number; // in cents
  target_date: string;
  current_amount: number; // in cents
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type BankConnectionStatus = 'active' | 'error' | 'disconnected';

export interface BankConnection {
  id: string;
  family_id: string;
  plaid_item_id: string;
  plaid_access_token: string;
  institution_name: string | null;
  institution_id: string | null;
  last_synced_at: string | null;
  status: BankConnectionStatus;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type BankAccountType = 'depository' | 'credit' | 'loan' | 'investment' | 'other';

export interface BankAccount {
  id: string;
  connection_id: string;
  family_id: string;
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  type: BankAccountType;
  subtype: string | null;
  mask: string | null;
  is_tracked: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  family_id: string;
  account_id: string;
  plaid_transaction_id: string;
  amount: number; // in cents (positive = spending)
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  date: string;
  pending: boolean;
  linked_event_id: string | null;
  category_id: string | null;  // Links to merchant_categories
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankTransactionWithAccount extends BankTransaction {
  account: BankAccount;
}

export interface BankTransactionWithCategory extends BankTransaction {
  account: BankAccount;
  merchant_category: MerchantCategory | null;
}

export interface MerchantRule {
  id: string;
  family_id: string;
  keyword: string;
  event_id: string;
  created_at: string;
}

export interface MerchantRuleWithEvent extends MerchantRule {
  event: Event;
}

export type CategoryType = 'budget' | 'event';

export interface MerchantCategory {
  id: string;
  family_id: string;
  name: string;
  keywords: string[];
  category_type: CategoryType;
  monthly_budget: number | null;  // For budget-type (in cents)
  event_id: string | null;        // For event-type
  created_at: string;
  updated_at: string;
}

export interface MerchantCategoryWithEvent extends MerchantCategory {
  event: Event | null;
}

// Budget calculation types
export interface MoneyStatus {
  budget: number;
  spent: number;
  spokenFor: number;
  unallocated: number;
  incomeReceived: number;
  incomeExpected: number;
}

// Database types for Supabase client
export interface Database {
  public: {
    Tables: {
      families: {
        Row: Family;
        Insert: Omit<Family, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Family, 'id' | 'created_at' | 'updated_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      family_members: {
        Row: FamilyMember;
        Insert: Omit<FamilyMember, 'id' | 'created_at'>;
        Update: Partial<Omit<FamilyMember, 'id' | 'family_id' | 'created_at'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Event, 'id' | 'family_id' | 'created_at' | 'updated_at'>>;
      };
      event_participants: {
        Row: EventParticipant;
        Insert: Omit<EventParticipant, 'id' | 'created_at'>;
        Update: never;
      };
      checklist_items: {
        Row: ChecklistItem;
        Insert: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChecklistItem, 'id' | 'event_id' | 'family_id' | 'created_at' | 'updated_at'>>;
      };
      checklist_templates: {
        Row: ChecklistTemplate;
        Insert: Omit<ChecklistTemplate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChecklistTemplate, 'id' | 'family_id' | 'created_at' | 'updated_at'>>;
      };
      budget_periods: {
        Row: BudgetPeriod;
        Insert: Omit<BudgetPeriod, 'id' | 'created_at'>;
        Update: Partial<Omit<BudgetPeriod, 'id' | 'family_id' | 'created_at'>>;
      };
      savings_goals: {
        Row: SavingsGoal;
        Insert: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SavingsGoal, 'id' | 'family_id' | 'created_at' | 'updated_at'>>;
      };
      bank_connections: {
        Row: BankConnection;
        Insert: Omit<BankConnection, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BankConnection, 'id' | 'family_id' | 'created_at' | 'updated_at'>>;
      };
      bank_accounts: {
        Row: BankAccount;
        Insert: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BankAccount, 'id' | 'family_id' | 'created_at' | 'updated_at'>>;
      };
      bank_transactions: {
        Row: BankTransaction;
        Insert: Omit<BankTransaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BankTransaction, 'id' | 'family_id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
