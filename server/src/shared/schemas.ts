import { z } from 'zod';

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const SignUpSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: PasswordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export const LoginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase()
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  amount: z.number().int().positive('Amount must be positive'),
  currency: z.string().length(3).toUpperCase(),
  categoryId: z.string().min(1, 'Category is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, 'Invalid date format'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  note: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
  tags: z.array(z.string().trim().min(1).max(30)).optional(),
  account: z.string().max(50).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Category name required').max(50),
  type: z.enum(['income', 'expense', 'both']),
  icon: z.string().min(1),
  color: z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color'),
  isDefault: z.boolean().optional()
});

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month format must be YYYY-MM'),
  categoryId: z.string().min(1),
  limitAmount: z.number().int().nonnegative('Limit must be 0 or positive'),
  rolloverEnabled: z.boolean().optional(),
  previousRollover: z.number().int().optional()
});

export const RecurringRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Rule name is required').max(100),
  type: z.enum(['income', 'expense']),
  amount: z.number().int().positive('Amount must be positive'),
  currency: z.string().length(3).toUpperCase(),
  categoryId: z.string().min(1),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']),
  customIntervalDays: z.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD').optional().nullable(),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  paymentMethod: z.string().optional(),
  reminderDaysBefore: z.number().int().nonnegative().optional(),
  status: z.enum(['active', 'paused']),
  autoCreate: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const SavingsGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Goal name is required').max(100),
  targetAmount: z.number().int().positive('Target amount must be positive'),
  currentAmount: z.number().int().nonnegative(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be YYYY-MM-DD'),
  categoryId: z.string().optional(),
  note: z.string().max(500).optional(),
  contributions: z.array(z.object({
    id: z.string().uuid(),
    amount: z.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().max(200).optional()
  })),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const UserPreferencesSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  locale: z.string().min(2),
  firstDayOfWeek: z.number().int().min(0).max(6),
  theme: z.enum(['dark', 'light', 'system']),
  budgetThresholds: z.array(z.number().min(1).max(200)),
  budgetRolloverDefault: z.boolean(),
  autoBackup: z.boolean(),
  backupFrequency: z.enum(['realtime', 'daily', 'weekly', 'manual']),
  encryptionEnabled: z.boolean(),
  lastBackupAt: z.string().optional(),
  lastSyncAt: z.string().optional()
});

export const FinancialDataPayloadSchema = z.object({
  schemaVersion: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  exportedAt: z.string(),
  transactions: z.array(TransactionSchema),
  categories: z.array(CategorySchema),
  budgets: z.array(BudgetSchema),
  recurringRules: z.array(RecurringRuleSchema),
  savingsGoals: z.array(SavingsGoalSchema),
  preferences: UserPreferencesSchema
});

export const EncryptedBackupPayloadSchema = z.object({
  schemaVersion: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  encrypted: z.literal(true),
  algorithm: z.literal('AES-GCM-256'),
  kdf: z.literal('PBKDF2'),
  salt: z.string().min(16),
  nonce: z.string().min(12),
  ciphertext: z.string().min(1),
  authTag: z.string().optional(),
  exportedAt: z.string()
});
