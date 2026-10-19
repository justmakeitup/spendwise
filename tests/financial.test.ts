import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeCsvCell,
  parseCsvText,
  parseAmountToCents,
  parseDateToIso,
  exportTransactionsToCsv
} from '../client/src/lib/csv/csvHelper';
import { formatCurrency, parseInputToMinorUnits } from '../client/src/lib/currency';
import { DEFAULT_CATEGORIES, Transaction } from '../shared/src';

describe('Financial Calculations and CSV Integrity Tests', () => {
  test('Currency formatting converts integer minor units to localized major units', () => {
    assert.strictEqual(formatCurrency(2450, 'USD', 'en-US'), '$24.50');
    assert.strictEqual(formatCurrency(100000, 'USD', 'en-US'), '$1,000.00');
    assert.strictEqual(formatCurrency(0, 'USD', 'en-US'), '$0.00');
  });

  test('parseInputToMinorUnits correctly converts decimal string input to integer cents', () => {
    assert.strictEqual(parseInputToMinorUnits('24.50', 'USD'), 2450);
    assert.strictEqual(parseInputToMinorUnits('1,250.75', 'USD'), 125075);
    assert.strictEqual(parseInputToMinorUnits('$99.99', 'USD'), 9999);
  });

  test('sanitizeCsvCell prevents CSV formula injection attacks', () => {
    // Dangerous prefixes: =, +, -, @
    assert.strictEqual(sanitizeCsvCell('=SUM(A1:A10)'), "'=SUM(A1:A10)");
    assert.strictEqual(sanitizeCsvCell('+cmd|/c calc!A0'), "'+cmd|/c calc!A0");
    assert.strictEqual(sanitizeCsvCell('-10+20'), "'-10+20");
    assert.strictEqual(sanitizeCsvCell('@username'), "'@username");

    // Standard safe cell
    assert.strictEqual(sanitizeCsvCell('Whole Foods Groceries'), 'Whole Foods Groceries');

    // Quotes and commas escaping
    assert.strictEqual(sanitizeCsvCell('Coffee, Tea & "Cake"'), '"Coffee, Tea & ""Cake"""');
  });

  test('parseCsvText correctly handles commas, quotes, and newlines per RFC 4180', () => {
    const csv = `Date,Amount,Description\n2026-10-01,15.50,"Latte, Cookie"\n2026-10-02,120.00,"New ""Smart"" Watch"`;
    const rows = parseCsvText(csv);

    assert.strictEqual(rows.length, 3);
    assert.deepStrictEqual(rows[0], ['Date', 'Amount', 'Description']);
    assert.deepStrictEqual(rows[1], ['2026-10-01', '15.50', 'Latte, Cookie']);
    assert.deepStrictEqual(rows[2], ['2026-10-02', '120.00', 'New "Smart" Watch']);
  });

  test('parseAmountToCents extracts numeric values and infers income/expense correctly', () => {
    const resPositive = parseAmountToCents('$45.99');
    assert.ok(resPositive);
    assert.strictEqual(resPositive.cents, 4599);

    const resNegative = parseAmountToCents('-$12.00');
    assert.ok(resNegative);
    assert.strictEqual(resNegative.cents, 1200);
    assert.strictEqual(resNegative.inferredType, 'expense');
  });

  test('parseDateToIso converts heterogeneous date formats into standard YYYY-MM-DD', () => {
    assert.strictEqual(parseDateToIso('2026-10-19'), '2026-10-19');
    assert.strictEqual(parseDateToIso('10/19/2026'), '2026-10-19');
  });

  test('exportTransactionsToCsv generates valid sanitized CSV output', () => {
    const sampleTxs: Transaction[] = [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 3550,
        currency: 'USD',
        categoryId: 'cat-food',
        date: '2026-10-19',
        paymentMethod: 'Credit Card',
        note: '=POTENTIAL_INJECTION',
        tags: ['food', 'lunch'],
        createdAt: '2026-10-19T10:00:00Z',
        updatedAt: '2026-10-19T10:00:00Z'
      }
    ];

    const csv = exportTransactionsToCsv(sampleTxs, DEFAULT_CATEGORIES);
    assert.ok(csv.includes('ID,Date,Type,Amount,Currency,Category'));
    assert.ok(csv.includes("35.50,USD,Food & Groceries,Credit Card,'=POTENTIAL_INJECTION"));
  });
});
