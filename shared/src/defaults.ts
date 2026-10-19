import { Category, UserPreferences } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food & Groceries', type: 'expense', icon: 'UtensilsCrossed', color: '#10B981', isDefault: true },
  { id: 'cat-transport', name: 'Transport & Fuel', type: 'expense', icon: 'Car', color: '#3B82F6', isDefault: true },
  { id: 'cat-housing', name: 'Housing & Rent', type: 'expense', icon: 'Home', color: '#8B5CF6', isDefault: true },
  { id: 'cat-utilities', name: 'Utilities & Bills', type: 'expense', icon: 'Zap', color: '#F59E0B', isDefault: true },
  { id: 'cat-shopping', name: 'Shopping & Retail', type: 'expense', icon: 'ShoppingBag', color: '#EC4899', isDefault: true },
  { id: 'cat-entertainment', name: 'Entertainment & Fun', type: 'expense', icon: 'Film', color: '#6366F1', isDefault: true },
  { id: 'cat-health', name: 'Health & Medical', type: 'expense', icon: 'HeartPulse', color: '#EF4444', isDefault: true },
  { id: 'cat-education', name: 'Education & Learning', type: 'expense', icon: 'GraduationCap', color: '#06B6D4', isDefault: true },
  { id: 'cat-subscriptions', name: 'Subscriptions', type: 'expense', icon: 'Tv', color: '#A855F7', isDefault: true },
  { id: 'cat-travel', name: 'Travel & Vacation', type: 'expense', icon: 'Plane', color: '#14B8A6', isDefault: true },
  { id: 'cat-personal', name: 'Personal Care', type: 'expense', icon: 'Sparkles', color: '#F43F5E', isDefault: true },
  { id: 'cat-salary', name: 'Salary & Wages', type: 'income', icon: 'Briefcase', color: '#10B981', isDefault: true },
  { id: 'cat-freelance', name: 'Freelance & Side Hustle', type: 'income', icon: 'Laptop', color: '#3B82F6', isDefault: true },
  { id: 'cat-investments', name: 'Investments & Dividends', type: 'income', icon: 'TrendingUp', color: '#8B5CF6', isDefault: true },
  { id: 'cat-gifts', name: 'Gifts & Awards', type: 'income', icon: 'Gift', color: '#F59E0B', isDefault: true },
  { id: 'cat-other-income', name: 'Other Income', type: 'income', icon: 'Coins', color: '#64748B', isDefault: true },
  { id: 'cat-other-expense', name: 'Other Expense', type: 'expense', icon: 'HelpCircle', color: '#64748B', isDefault: true }
];

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Mobile Payment',
  'Cryptocurrency',
  'Cheque',
  'Other'
];

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', digits: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', digits: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', digits: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', digits: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', digits: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', digits: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', digits: 0 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', digits: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', digits: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', digits: 2 }
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'USD',
  locale: 'en-US',
  firstDayOfWeek: 1, // Monday
  theme: 'dark',
  budgetThresholds: [75, 90, 100],
  budgetRolloverDefault: false,
  autoBackup: false,
  backupFrequency: 'manual',
  encryptionEnabled: false
};
