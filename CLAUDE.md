# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

OKAYfam is a family budget and event management app built with:
- **Next.js 16** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth with RLS)
- **Tailwind CSS** with shadcn-style components

### Directory Structure

- `src/app/(auth)/` - Login/signup pages
- `src/app/(app)/` - Authenticated app pages (dashboard, events, budget, savings, settings)
- `src/components/ui/` - Base UI components (Button, Card, Input, etc.)
- `src/lib/actions/` - Server actions for mutations
- `src/lib/queries/` - Data fetching functions
- `src/lib/supabase/` - Supabase client setup (server, client, middleware)
- `supabase/migrations/` - Database migrations

### Key Patterns

**Server Actions:** All mutations use server actions with `'use server'`. Pattern:
1. Validate input with Zod schema from `lib/validations.ts`
2. Call Supabase API
3. Call `revalidatePath()` to invalidate cache
4. Return `{ error: string }` on failure

**Data Fetching:** Query functions in `lib/queries/index.ts` use server-side Supabase client. Pages use `Promise.all()` for parallel fetching.

**Money:** All monetary values stored as **integers in cents**. Use `formatMoney(cents)` to display and `parseMoney(dollars)` to convert user input.

**Auth:** Cookie-based sessions via `@supabase/ssr`. Middleware refreshes session on each request. Protected routes redirect to `/login`.

**Database:** RLS policies use `get_user_family_id()` helper to isolate data by family. All tables have `family_id` column.

### Core Domain Types

- `Event` - Can be 'expense', 'income', or 'calendar' type with status 'upcoming', 'completed', or 'cancelled'
- `MoneyStatus` - Budget calculation with spent (completed expenses), spoken-for (upcoming expenses), and income tracking
- Recurrence uses `recurrence_parent_id` to link series

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
