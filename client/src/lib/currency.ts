import { SUPPORTED_CURRENCIES } from '@spendwise/shared';

export function formatCurrency(
  minorUnits: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || {
    code: currencyCode,
    digits: 2
  };

  const divisor = Math.pow(10, currencyInfo.digits);
  const majorUnits = minorUnits / divisor;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyInfo.digits,
      maximumFractionDigits: currencyInfo.digits
    }).format(majorUnits);
  } catch (err) {
    // Fallback if locale or currency code throws
    return `${currencyCode} ${majorUnits.toFixed(currencyInfo.digits)}`;
  }
}

export function parseInputToMinorUnits(value: string | number, currencyCode: string = 'USD'): number {
  if (typeof value === 'number') return Math.round(value);
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || { digits: 2 };
  const clean = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * Math.pow(10, currencyInfo.digits));
}

export function minorUnitsToInputValue(minorUnits: number, currencyCode: string = 'USD'): string {
  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode) || { digits: 2 };
  const divisor = Math.pow(10, currencyInfo.digits);
  return (minorUnits / divisor).toFixed(currencyInfo.digits);
}
