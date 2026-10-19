export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // Stored in minor currency units (cents/pennies)
  currency: string;
  categoryId: string;
  date: string; // ISO 8601 string: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DD
  paymentMethod: string;
  note?: string;
  tags?: string[];
  account?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  categoryId: string; // 'total' for monthly overall budget, or specific categoryId
  limitAmount: number; // minor currency units
  rolloverEnabled?: boolean;
  previousRollover?: number; // minor currency units carried from previous month
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurringRule {
  id: string;
  name: string;
  type: TransactionType;
  amount: number; // minor currency units
  currency: string;
  categoryId: string;
  frequency: RecurringFrequency;
  customIntervalDays?: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  paymentMethod?: string;
  reminderDaysBefore?: number;
  status: 'active' | 'paused';
  autoCreate?: boolean; // if true, system proposes or auto-creates when due
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: string;
  amount: number; // minor currency units
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number; // minor currency units
  currentAmount: number; // minor currency units
  targetDate: string; // YYYY-MM-DD
  categoryId?: string;
  note?: string;
  contributions: GoalContribution[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  currency: string;
  locale: string;
  firstDayOfWeek: number; // 0 for Sunday, 1 for Monday
  theme: 'dark' | 'light' | 'system';
  budgetThresholds: number[]; // e.g., [75, 90, 100]
  budgetRolloverDefault: boolean;
  autoBackup: boolean;
  backupFrequency: 'realtime' | 'daily' | 'weekly' | 'manual';
  encryptionEnabled: boolean;
  lastBackupAt?: string;
  lastSyncAt?: string;
}

export interface FinancialDataPayload {
  schemaVersion: number;
  revision: number;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringRules: RecurringRule[];
  savingsGoals: SavingsGoal[];
  preferences: UserPreferences;
}

export interface EncryptedBackupPayload {
  schemaVersion: number;
  revision: number;
  encrypted: true;
  algorithm: 'AES-GCM-256';
  kdf: 'PBKDF2';
  salt: string; // base64
  nonce: string; // base64
  ciphertext: string; // base64
  authTag?: string; // included in ciphertext or separate
  exportedAt: string;
}

export type BackupFileFormat = FinancialDataPayload | EncryptedBackupPayload;

export interface UserProfile {
  id: string;
  email: string;
  isEmailVerified: boolean;
  driveConnected: boolean;
  driveEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  message?: string;
}
