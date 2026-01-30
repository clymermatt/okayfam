// Google Sheets integration for importing transactions

export interface SheetTransaction {
  date: string;
  description: string;
  amount: number; // in cents
}

export interface SheetParseResult {
  success: boolean;
  transactions: SheetTransaction[];
  error?: string;
}

/**
 * Extract sheet ID from a Google Sheets URL
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch and parse a public Google Sheet
 * Sheet must be shared as "Anyone with the link can view"
 * Expected columns: Date, Description, Amount
 */
export async function fetchGoogleSheet(sheetId: string): Promise<SheetParseResult> {
  try {
    // Use the CSV export URL (works for public sheets)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    const response = await fetch(csvUrl, {
      headers: {
        'Accept': 'text/csv',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, transactions: [], error: 'Sheet not found. Make sure the URL is correct.' };
      }
      if (response.status === 403) {
        return { success: false, transactions: [], error: 'Cannot access sheet. Make sure it\'s shared as "Anyone with the link can view".' };
      }
      return { success: false, transactions: [], error: `Failed to fetch sheet: ${response.status}` };
    }

    const csvContent = await response.text();
    return parseSheetCSV(csvContent);
  } catch (error) {
    return {
      success: false,
      transactions: [],
      error: error instanceof Error ? error.message : 'Failed to fetch sheet',
    };
  }
}

/**
 * Parse CSV content from Google Sheet
 */
function parseSheetCSV(csvContent: string): SheetParseResult {
  const transactions: SheetTransaction[] = [];
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    return { success: true, transactions: [] }; // Empty sheet is OK
  }

  // Parse header row
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

  const dateIdx = header.findIndex(h => h.includes('date'));
  const descIdx = header.findIndex(h => h.includes('description') || h.includes('merchant') || h.includes('name'));
  const amountIdx = header.findIndex(h => h.includes('amount'));

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return {
      success: false,
      transactions: [],
      error: `Missing required columns. Found: ${header.join(', ')}. Need: Date, Description, Amount`,
    };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const cols = parseCSVLine(line);

      const dateStr = cols[dateIdx]?.trim();
      const description = cols[descIdx]?.trim();
      const amountStr = cols[amountIdx]?.trim();

      // Skip empty rows
      if (!dateStr || !description || !amountStr) continue;

      // Parse date - try multiple formats
      const date = parseDate(dateStr);
      if (!date) continue;

      // Parse amount
      const amount = parseAmount(amountStr);
      if (amount === null) continue;

      transactions.push({
        date,
        description,
        amount,
      });
    } catch {
      // Skip invalid rows
      continue;
    }
  }

  return { success: true, transactions };
}

/**
 * Parse a date string in various formats
 */
function parseDate(dateStr: string): string | null {
  // Try MM/DD/YYYY or MM/DD/YY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]);
    const day = parseInt(slashMatch[2]);
    let year = parseInt(slashMatch[3]);
    if (year < 100) year += 2000;

    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Try YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return dateStr;
    }
  }

  // Try parsing with Date constructor
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parse an amount string to cents
 */
function parseAmount(amountStr: string): number | null {
  // Remove currency symbols and spaces
  const cleaned = amountStr.replace(/[$\s]/g, '').trim();

  // Handle parentheses for negative (accounting format)
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const numStr = isNegative ? cleaned.slice(1, -1) : cleaned;

  // Parse the number
  const amount = parseFloat(numStr.replace(/,/g, ''));
  if (isNaN(amount)) return null;

  // Convert to cents and apply sign
  // Positive in sheet = expense (outflow)
  // Negative in sheet = income/credit (inflow)
  const cents = Math.round(Math.abs(amount) * 100);
  return isNegative || amount < 0 ? -cents : cents;
}

/**
 * Parse a CSV line handling quoted fields
 */
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
