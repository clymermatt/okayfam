import { SupabaseClient } from '@supabase/supabase-js';

interface MatchResult {
  matched: number;
  details: Array<{
    transactionId: string;
    eventId: string;
    transactionName: string;
    eventTitle: string;
    matchType: 'category' | 'keyword_rule' | 'event_title' | 'amount_date';
  }>;
}

/**
 * Automatically link unlinked transactions to matching events
 *
 * Matching criteria (in priority order):
 * 1. Category rules - merchant contains any keyword from a category → link to category's event
 * 2. Legacy keyword rules - merchant name contains keyword → link to specified event
 * 3. Event title match - merchant name matches event title (or vice versa)
 * 4. Amount + Date - amount within 20%, date within 3 days
 *
 * Note: Category rules allow multiple transactions to link to the same event (intentional for grouping)
 * Other match types enforce 1:1 relationship
 */
export async function autoMatchTransactions(
  supabase: SupabaseClient,
  familyId: string
): Promise<MatchResult> {
  const result: MatchResult = { matched: 0, details: [] };

  // Get unlinked transactions
  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('family_id', familyId)
    .is('linked_event_id', null)
    .eq('is_hidden', false);

  if (!transactions || transactions.length === 0) {
    return result;
  }

  // Get merchant categories (new system)
  const { data: categories } = await supabase
    .from('merchant_categories')
    .select('*')
    .eq('family_id', familyId);

  // Get legacy keyword rules (for backwards compatibility)
  const { data: rules } = await supabase
    .from('merchant_rules')
    .select('*')
    .eq('family_id', familyId);

  // Get all events
  const { data: allEvents } = await supabase
    .from('events')
    .select('*')
    .eq('family_id', familyId);

  const eventMap = new Map();
  for (const event of allEvents || []) {
    eventMap.set(event.id, event);
  }

  // For non-category matches, track which events already have links (1:1 enforcement)
  const { data: alreadyLinkedTx } = await supabase
    .from('bank_transactions')
    .select('linked_event_id')
    .eq('family_id', familyId)
    .not('linked_event_id', 'is', null);

  const eventsWithLinks = new Set(
    (alreadyLinkedTx || []).map(tx => tx.linked_event_id)
  );

  // Track events we link during this run (for 1:1 enforcement on non-category matches)
  const linkedThisRun = new Set<string>();

  // Process each unlinked transaction
  for (const transaction of transactions) {
    const merchantName = (transaction.merchant_name || transaction.name || '').toLowerCase();
    const merchantKeywords = extractKeywords(merchantName);
    const txAmount = transaction.amount;
    const txDate = new Date(transaction.date);

    // Helper to check if event is available for 1:1 linking
    const isEventAvailable = (eventId: string) =>
      !eventsWithLinks.has(eventId) && !linkedThisRun.has(eventId);

    // First, check merchant categories
    let matched = false;
    if (categories && categories.length > 0) {
      for (const category of categories) {
        // Check if merchant contains ANY of the category's keywords
        const keywordMatch = category.keywords.some((keyword: string) =>
          merchantName.includes(keyword.toLowerCase())
        );

        if (keywordMatch) {
          if (category.category_type === 'budget') {
            // Budget-type: just tag with category, no event link
            await tagTransactionWithCategory(supabase, transaction.id, category.id);
            result.matched++;
            result.details.push({
              transactionId: transaction.id,
              eventId: '',
              transactionName: transaction.name,
              eventTitle: category.name,
              matchType: 'category',
            });
            matched = true;
            break;
          } else if (category.category_type === 'event' && category.event_id) {
            // Event-type: tag with category AND link to event
            const targetEvent = eventMap.get(category.event_id);
            if (targetEvent) {
              await tagTransactionWithCategory(supabase, transaction.id, category.id);
              await linkTransactionToEvent(supabase, transaction.id, targetEvent.id, txAmount);
              result.matched++;
              result.details.push({
                transactionId: transaction.id,
                eventId: targetEvent.id,
                transactionName: transaction.name,
                eventTitle: targetEvent.title,
                matchType: 'category',
              });
              matched = true;
              break;
            }
          }
        }
      }
    }

    if (matched) continue;

    // Second, check legacy keyword rules (for backwards compatibility)
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const keyword = rule.keyword.toLowerCase();
        if (merchantName.includes(keyword)) {
          const targetEvent = eventMap.get(rule.event_id);
          if (targetEvent && isEventAvailable(targetEvent.id)) {
            await linkTransactionToEvent(supabase, transaction.id, targetEvent.id, txAmount);
            linkedThisRun.add(targetEvent.id);
            result.matched++;
            result.details.push({
              transactionId: transaction.id,
              eventId: targetEvent.id,
              transactionName: transaction.name,
              eventTitle: targetEvent.title,
              matchType: 'keyword_rule',
            });
            matched = true;
            break;
          }
        }
      }
    }

    if (matched) continue;

    // Third, check if merchant name matches any event title (1:1 only)
    // Also require transaction date to be within a reasonable range of event date
    for (const [eventId, event] of eventMap) {
      if (!isEventAvailable(eventId)) continue;

      const eventTitle = event.title.toLowerCase();
      const eventKeywords = extractKeywords(eventTitle);

      const titleMatch =
        merchantName.includes(eventTitle) ||
        eventTitle.includes(merchantName) ||
        hasSignificantKeywordMatch(merchantKeywords, eventKeywords);

      if (titleMatch) {
        // Check date proximity - transaction should be within 15 days before to 7 days after event
        const eventDate = new Date(event.event_date);
        const daysDiff = (txDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24);

        // Allow transactions from 15 days before to 7 days after the event date
        if (daysDiff < -15 || daysDiff > 7) continue;

        await linkTransactionToEvent(supabase, transaction.id, event.id, txAmount);
        linkedThisRun.add(event.id);
        result.matched++;
        result.details.push({
          transactionId: transaction.id,
          eventId: event.id,
          transactionName: transaction.name,
          eventTitle: event.title,
          matchType: 'event_title',
        });
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Fourth, try amount + date matching (1:1 only)
    for (const [eventId, event] of eventMap) {
      if (!isEventAvailable(eventId)) continue;
      if (event.status !== 'upcoming') continue; // Only match upcoming events

      const eventAmount = event.estimated_cost;
      const eventDate = new Date(event.event_date);

      const daysDiff = Math.abs((txDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 3) continue;

      const amountDiff = Math.abs(txAmount - eventAmount);
      const amountThreshold = Math.max(eventAmount * 0.2, 100);
      if (amountDiff > amountThreshold) continue;

      await linkTransactionToEvent(supabase, transaction.id, event.id, txAmount);
      linkedThisRun.add(event.id);
      result.matched++;
      result.details.push({
        transactionId: transaction.id,
        eventId: event.id,
        transactionName: transaction.name,
        eventTitle: event.title,
        matchType: 'amount_date',
      });
      break; // Only match to one event
    }
  }

  return result;
}

/**
 * Tag a transaction with a category
 */
async function tagTransactionWithCategory(
  supabase: SupabaseClient,
  transactionId: string,
  categoryId: string
) {
  await supabase
    .from('bank_transactions')
    .update({ category_id: categoryId })
    .eq('id', transactionId);
}

/**
 * Link a transaction to an event and update the event's actual_cost
 */
async function linkTransactionToEvent(
  supabase: SupabaseClient,
  transactionId: string,
  eventId: string,
  amount: number
) {
  // Update transaction with linked event
  await supabase
    .from('bank_transactions')
    .update({ linked_event_id: eventId })
    .eq('id', transactionId);

  // Update event status to completed and set actual_cost
  await supabase
    .from('events')
    .update({
      status: 'completed',
      actual_cost: amount,
    })
    .eq('id', eventId);
}

/**
 * Create a keyword rule for auto-matching
 */
export async function createMerchantRule(
  supabase: SupabaseClient,
  familyId: string,
  keyword: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('merchant_rules')
    .insert({
      family_id: familyId,
      keyword: keyword.toLowerCase().trim(),
      event_id: eventId,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a keyword rule
 */
export async function deleteMerchantRule(
  supabase: SupabaseClient,
  ruleId: string,
  familyId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('merchant_rules')
    .delete()
    .eq('id', ruleId)
    .eq('family_id', familyId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Extract meaningful keywords from a string (merchant name or event title)
 * Removes numbers, special characters, and common words
 */
function extractKeywords(text: string): string[] {
  // Common words to ignore
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'payment', 'purchase', 'transaction', 'debit', 'credit', 'card',
    'pos', 'ach', 'check', 'deposit', 'withdrawal', 'transfer',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')  // Remove non-letters
    .split(/\s+/)               // Split on whitespace
    .filter(word => word.length >= 3 && !stopWords.has(word));
}

/**
 * Check if two keyword sets have a significant match
 * Returns true if they share at least one meaningful keyword
 */
function hasSignificantKeywordMatch(keywords1: string[], keywords2: string[]): boolean {
  if (keywords1.length === 0 || keywords2.length === 0) {
    return false;
  }

  const set2 = new Set(keywords2);

  for (const keyword of keywords1) {
    // Direct match
    if (set2.has(keyword)) {
      return true;
    }

    // Partial match - one keyword contains the other (min 4 chars)
    if (keyword.length >= 4) {
      for (const kw2 of keywords2) {
        if (kw2.length >= 4 && (keyword.includes(kw2) || kw2.includes(keyword))) {
          return true;
        }
      }
    }
  }

  return false;
}
