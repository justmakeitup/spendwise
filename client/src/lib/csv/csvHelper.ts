import { Transaction, Category } from '@spendwise/shared';

// Prevent CSV formula injection by prepending single quote if dangerous prefix is detected
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports transactions to RFC 4180 compliant CSV string.
 */
export function exportTransactionsToCsv(transactions: Transaction[], categories: Category[]): string {
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const headers = [
    'ID',
    'Date',
    'Type',
    'Amount',
    'Currency',
    'Category',
    'Payment Method',
    'Note',
    'Tags',
    'Account'
  ];

  const rows = transactions.map(t => [
    t.id,
    t.date.split('T')[0],
    t.type,
    (t.amount / 100).toFixed(2),
    t.currency,
    categoryMap.get(t.categoryId) || t.categoryId,
    t.paymentMethod,
    t.note || '',
    (t.tags || []).join('; '),
    t.account || ''
  ]);

  const csvLines = [
    headers.map(sanitizeCsvCell).join(','),
    ...rows.map(row => row.map(sanitizeCsvCell).join(','))
  ];

  return csvLines.join('\r\n');
}

/**
 * Robust RFC 4180 CSV line/token parser.
 */
export function parseCsvText(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.length > 0 && currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface CsvColumnMapping {
  date: number;
  type: number;
  amount: number;
  category: number;
  paymentMethod: number;
  note: number;
  tags: number;
}

export interface ParsedCsvRow {
  rowIndex: number;
  raw: string[];
  parsed?: Partial<Transaction>;
  error?: string;
  isDuplicate?: boolean;
}

/**
 * Parses amount string (e.g. "$1,234.50" or "-50.00") into minor units (integer cents).
 */
export function parseAmountToCents(amountStr: string): { cents: number; inferredType?: 'income' | 'expense' } | null {
  if (!amountStr) return null;
  const clean = amountStr.replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  const isNegative = num < 0;
  const cents = Math.round(Math.abs(num) * 100);

  return {
    cents,
    inferredType: isNegative ? 'expense' : undefined
  };
}

/**
 * Normalizes different date formats (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY) into ISO YYYY-MM-DD.
 */
export function parseDateToIso(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }

  // If MM/DD/YYYY or DD/MM/YYYY
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (c.length === 4) {
      // a/b/YYYY -> Assume YYYY-MM-DD
      const year = c;
      const month = a.padStart(2, '0');
      const day = b.padStart(2, '0');
      const d = new Date(`${year}-${month}-${day}`);
      if (!isNaN(d.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}
