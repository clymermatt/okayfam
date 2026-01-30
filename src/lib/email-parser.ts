// Parse Chase transaction alert emails

export interface ParsedTransaction {
  amount: number; // in cents
  merchant: string;
  date: string; // YYYY-MM-DD
  cardLast4?: string;
  isCredit?: boolean; // true = refund/credit, false = charge
  raw?: string; // original text for debugging
}

export interface ParseEmailResult {
  success: boolean;
  transaction?: ParsedTransaction;
  error?: string;
}

/**
 * Parse a Chase transaction alert email
 *
 * Common Chase email formats:
 * - Subject: "Your $XX.XX transaction with MERCHANT NAME"
 * - Subject: "Your $XX.XX debit card transaction"
 * - Subject: "A]Your $XX.XX transaction with MERCHANT" (alerts)
 * - Body contains card ending in XXXX, date, etc.
 */
export function parseChaseEmail(subject: string, body: string): ParseEmailResult {
  try {
    // Clean up subject line (remove alert prefixes)
    const cleanSubject = subject.replace(/^[\[\]A-Za-z\s]*/, '').trim();

    // Try to extract amount from subject
    // Matches: $XX.XX or $X,XXX.XX
    const amountMatch = subject.match(/\$([0-9,]+\.?\d*)/);
    if (!amountMatch) {
      return { success: false, error: 'Could not find amount in email' };
    }

    const amountStr = amountMatch[1].replace(/,/g, '');
    const amount = Math.round(parseFloat(amountStr) * 100);

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    // Extract merchant from subject
    // Pattern: "transaction with MERCHANT NAME"
    let merchant = 'Unknown Merchant';
    const merchantMatch = subject.match(/transaction with\s+(.+?)(?:\s+on|\s+has|\.|$)/i);
    if (merchantMatch) {
      merchant = merchantMatch[1].trim();
    } else {
      // Fallback: try to get merchant from after the amount
      const afterAmount = subject.split(amountMatch[0])[1];
      if (afterAmount) {
        const words = afterAmount.replace(/transaction|with|at|from/gi, '').trim();
        if (words.length > 0) {
          merchant = words.split(/\s+on\s+/)[0].trim() || 'Unknown Merchant';
        }
      }
    }

    // Clean up merchant name
    merchant = merchant
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&'-]/g, '')
      .trim()
      .substring(0, 100);

    if (!merchant || merchant.toLowerCase() === 'unknown') {
      merchant = 'Unknown Merchant';
    }

    // Extract card last 4 digits from body
    // Pattern: "ending in XXXX" or "card (XXXX)"
    let cardLast4: string | undefined;
    const cardMatch = body.match(/(?:ending in|card.*?\()\s*(\d{4})/i);
    if (cardMatch) {
      cardLast4 = cardMatch[1];
    }

    // Try to extract date from body
    // Patterns: "on MM/DD/YYYY", "on Month DD, YYYY", "MM/DD/YY"
    let date = new Date().toISOString().split('T')[0]; // Default to today

    const datePatterns = [
      /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /on\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const dateMatch = body.match(pattern) || subject.match(pattern);
      if (dateMatch) {
        try {
          let parsedDate: Date;

          if (dateMatch[1].includes('/')) {
            // MM/DD/YYYY format
            const parts = dateMatch[1].split('/');
            const month = parseInt(parts[0]) - 1;
            const day = parseInt(parts[1]);
            let year = parseInt(parts[2]);
            if (year < 100) year += 2000;
            parsedDate = new Date(year, month, day);
          } else {
            // Month DD, YYYY format
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                               'july', 'august', 'september', 'october', 'november', 'december'];
            const month = monthNames.indexOf(dateMatch[1].toLowerCase());
            const day = parseInt(dateMatch[2]);
            const year = parseInt(dateMatch[3]);
            parsedDate = new Date(year, month, day);
          }

          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
            break;
          }
        } catch {
          // Continue to next pattern
        }
      }
    }

    // Check if this is a credit/refund
    const isCredit = /credit|refund|returned/i.test(subject) || /credit|refund|returned/i.test(body);

    return {
      success: true,
      transaction: {
        amount: isCredit ? -amount : amount,
        merchant,
        date,
        cardLast4,
        isCredit,
        raw: `Subject: ${subject}\n\nBody: ${body.substring(0, 500)}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse email',
    };
  }
}

/**
 * Parse a simple JSON format for Zapier/Make/Apps Script integrations
 */
export interface SimpleTransactionInput {
  amount: number | string; // dollars, e.g., 45.67 or "45.67"
  merchant: string;
  date?: string; // YYYY-MM-DD, defaults to today
  card_last4?: string;
  type?: 'charge' | 'credit';
}

export function parseSimpleTransaction(input: SimpleTransactionInput): ParseEmailResult {
  try {
    let amount: number;

    if (typeof input.amount === 'string') {
      amount = Math.round(parseFloat(input.amount.replace(/[$,]/g, '')) * 100);
    } else {
      amount = Math.round(input.amount * 100);
    }

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    if (!input.merchant || input.merchant.trim().length === 0) {
      return { success: false, error: 'Merchant is required' };
    }

    const isCredit = input.type === 'credit';

    return {
      success: true,
      transaction: {
        amount: isCredit ? -amount : amount,
        merchant: input.merchant.trim(),
        date: input.date || new Date().toISOString().split('T')[0],
        cardLast4: input.card_last4,
        isCredit,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse transaction',
    };
  }
}

/**
 * Parse Chase CSV export format
 * Supports multiple Chase CSV formats:
 * - Credit card: Transaction Date, Post Date, Description, Category, Type, Amount, Memo
 * - Checking: Details, Posting Date, Description, Amount, Type, Balance, Check or Slip #
 */
export interface CSVParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
}

export function parseChaseCSV(csvContent: string): CSVParseResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    return { success: false, transactions: [], errors: ['CSV file is empty or has no data rows'] };
  }

  // Parse header to find column indices
  const header = parseCSVLine(lines[0]);
  // Support both "Transaction Date" and "Posting Date"
  let dateIdx = header.findIndex(h => /transaction\s*date/i.test(h));
  if (dateIdx === -1) {
    dateIdx = header.findIndex(h => /posting\s*date/i.test(h));
  }
  const descIdx = header.findIndex(h => /description/i.test(h));
  const amountIdx = header.findIndex(h => /^amount$/i.test(h));
  const typeIdx = header.findIndex(h => /^type$/i.test(h));

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return {
      success: false,
      transactions: [],
      errors: [`CSV format not recognized. Found columns: ${header.join(', ')}. Expected: Posting Date (or Transaction Date), Description, Amount`],
    };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const cols = parseCSVLine(line);

      const dateStr = cols[dateIdx];
      const description = cols[descIdx];
      const amountStr = cols[amountIdx];
      const type = typeIdx !== -1 ? cols[typeIdx] : '';

      // Parse date (MM/DD/YYYY)
      const dateParts = dateStr.split('/');
      if (dateParts.length !== 3) {
        errors.push(`Row ${i + 1}: Invalid date format`);
        continue;
      }

      const month = parseInt(dateParts[0]) - 1;
      const day = parseInt(dateParts[1]);
      let year = parseInt(dateParts[2]);
      if (year < 100) year += 2000;

      const date = new Date(year, month, day);
      if (isNaN(date.getTime())) {
        errors.push(`Row ${i + 1}: Invalid date`);
        continue;
      }

      // Parse amount (Chase uses negative for charges, positive for credits)
      const amount = parseFloat(amountStr.replace(/[$,]/g, ''));
      if (isNaN(amount)) {
        errors.push(`Row ${i + 1}: Invalid amount`);
        continue;
      }

      // Chase CSV: negative = charge (outflow), positive = credit (inflow)
      // Our format: positive = charge, negative = credit
      const isCredit = amount > 0;
      const normalizedAmount = Math.round(Math.abs(amount) * 100);

      transactions.push({
        amount: isCredit ? -normalizedAmount : normalizedAmount,
        merchant: description.trim(),
        date: date.toISOString().split('T')[0],
        isCredit,
      });
    } catch (error) {
      errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  return {
    success: transactions.length > 0,
    transactions,
    errors,
  };
}

// Helper to parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
