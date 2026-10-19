import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Transaction,
  Category,
  Budget,
  RecurringRule,
  SavingsGoal,
  UserPreferences,
  FinancialDataPayload,
  DEFAULT_CATEGORIES,
  DEFAULT_PREFERENCES,
  FinancialDataPayloadSchema
} from '@spendwise/shared';

interface SpendWiseDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-date': string;
      'by-type': string;
      'by-category': string;
    };
  };
  categories: {
    key: string;
    value: Category;
  };
  budgets: {
    key: string;
    value: Budget;
    indexes: {
      'by-month': string;
    };
  };
  recurringRules: {
    key: string;
    value: RecurringRule;
    indexes: {
      'by-nextDueDate': string;
    };
  };
  savingsGoals: {
    key: string;
    value: SavingsGoal;
  };
  metadata: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'SpendWise_LocalDB';
const DB_VERSION = 1;

class IndexedDBStorage {
  private dbPromise: Promise<IDBPDatabase<SpendWiseDB>>;

  constructor() {
    this.dbPromise = this.init();
  }

  private async init(): Promise<IDBPDatabase<SpendWiseDB>> {
    return openDB<SpendWiseDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('by-date', 'date');
          txStore.createIndex('by-type', 'type');
          txStore.createIndex('by-category', 'categoryId');
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // Budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          const bStore = db.createObjectStore('budgets', { keyPath: 'id' });
          bStore.createIndex('by-month', 'month');
        }

        // Recurring store
        if (!db.objectStoreNames.contains('recurringRules')) {
          const rStore = db.createObjectStore('recurringRules', { keyPath: 'id' });
          rStore.createIndex('by-nextDueDate', 'nextDueDate');
        }

        // Savings store
        if (!db.objectStoreNames.contains('savingsGoals')) {
          db.createObjectStore('savingsGoals', { keyPath: 'id' });
        }

        // Metadata store (revision, preferences, etc.)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      }
    });
  }

  // --- Revision Management ---
  async getRevision(): Promise<number> {
    const db = await this.dbPromise;
    const rev = await db.get('metadata', 'revision');
    return typeof rev === 'number' ? rev : 1;
  }

  private async incrementRevision(): Promise<number> {
    const db = await this.dbPromise;
    const current = (await db.get('metadata', 'revision')) || 0;
    const next = current + 1;
    await db.put('metadata', next, 'revision');
    return next;
  }

  // --- Transactions ---
  async getAllTransactions(): Promise<Transaction[]> {
    const db = await this.dbPromise;
    const list = await db.getAll('transactions');
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const db = await this.dbPromise;
    return db.get('transactions', id);
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    const db = await this.dbPromise;
    await db.put('transactions', transaction);
    await this.incrementRevision();
  }

  async deleteTransaction(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('transactions', id);
    await this.incrementRevision();
  }

  async bulkSaveTransactions(transactions: Transaction[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('transactions', 'readwrite');
    for (const item of transactions) {
      await tx.store.put(item);
    }
    await tx.done;
    await this.incrementRevision();
  }

  // --- Categories ---
  async getAllCategories(): Promise<Category[]> {
    const db = await this.dbPromise;
    let categories = await db.getAll('categories');
    if (categories.length === 0) {
      // Seed default categories
      await this.bulkSaveCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    return categories;
  }

  async saveCategory(category: Category): Promise<void> {
    const db = await this.dbPromise;
    await db.put('categories', category);
    await this.incrementRevision();
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('categories', id);
    await this.incrementRevision();
  }

  async bulkSaveCategories(categories: Category[]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('categories', 'readwrite');
    for (const item of categories) {
      await tx.store.put(item);
    }
    await tx.done;
  }

  // --- Budgets ---
  async getAllBudgets(): Promise<Budget[]> {
    const db = await this.dbPromise;
    return db.getAll('budgets');
  }

  async getBudgetsForMonth(month: string): Promise<Budget[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('budgets', 'by-month', month);
  }

  async saveBudget(budget: Budget): Promise<void> {
    const db = await this.dbPromise;
    await db.put('budgets', budget);
    await this.incrementRevision();
  }

  async deleteBudget(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('budgets', id);
    await this.incrementRevision();
  }

  // --- Recurring Rules ---
  async getAllRecurringRules(): Promise<RecurringRule[]> {
    const db = await this.dbPromise;
    return db.getAll('recurringRules');
  }

  async saveRecurringRule(rule: RecurringRule): Promise<void> {
    const db = await this.dbPromise;
    await db.put('recurringRules', rule);
    await this.incrementRevision();
  }

  async deleteRecurringRule(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('recurringRules', id);
    await this.incrementRevision();
  }

  // --- Savings Goals ---
  async getAllSavingsGoals(): Promise<SavingsGoal[]> {
    const db = await this.dbPromise;
    return db.getAll('savingsGoals');
  }

  async saveSavingsGoal(goal: SavingsGoal): Promise<void> {
    const db = await this.dbPromise;
    await db.put('savingsGoals', goal);
    await this.incrementRevision();
  }

  async deleteSavingsGoal(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('savingsGoals', id);
    await this.incrementRevision();
  }

  // --- Preferences ---
  async getPreferences(): Promise<UserPreferences> {
    const db = await this.dbPromise;
    const pref = await db.get('metadata', 'preferences');
    return pref ? { ...DEFAULT_PREFERENCES, ...pref } : DEFAULT_PREFERENCES;
  }

  async savePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const db = await this.dbPromise;
    const current = await this.getPreferences();
    const updated = { ...current, ...preferences };
    await db.put('metadata', updated, 'preferences');
    await this.incrementRevision();
    return updated;
  }

  // --- Full Export / Snapshot ---
  async exportFullPayload(): Promise<FinancialDataPayload> {
    const [transactions, categories, budgets, recurringRules, savingsGoals, preferences, revision] = await Promise.all([
      this.getAllTransactions(),
      this.getAllCategories(),
      this.getAllBudgets(),
      this.getAllRecurringRules(),
      this.getAllSavingsGoals(),
      this.getPreferences(),
      this.getRevision()
    ]);

    return {
      schemaVersion: 1,
      revision,
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      budgets,
      recurringRules,
      savingsGoals,
      preferences
    };
  }

  // --- Full Import / Restore with Schema Validation ---
  async importFullPayload(payload: FinancialDataPayload, merge = false): Promise<void> {
    const validated = FinancialDataPayloadSchema.parse(payload);
    const db = await this.dbPromise;

    if (!merge) {
      // Clear current data
      await Promise.all([
        db.clear('transactions'),
        db.clear('categories'),
        db.clear('budgets'),
        db.clear('recurringRules'),
        db.clear('savingsGoals')
      ]);
    }

    // Save transactions
    const tx = db.transaction(['transactions', 'categories', 'budgets', 'recurringRules', 'savingsGoals', 'metadata'], 'readwrite');
    for (const t of validated.transactions) await tx.objectStore('transactions').put(t);
    for (const c of validated.categories) await tx.objectStore('categories').put(c);
    for (const b of validated.budgets) await tx.objectStore('budgets').put(b);
    for (const r of validated.recurringRules) await tx.objectStore('recurringRules').put(r);
    for (const s of validated.savingsGoals) await tx.objectStore('savingsGoals').put(s);

    await tx.objectStore('metadata').put(validated.preferences, 'preferences');
    await tx.objectStore('metadata').put(Math.max(validated.revision + 1, 1), 'revision');
    await tx.done;
  }

  // --- Clear all local data ---
  async clearAllData(): Promise<void> {
    const db = await this.dbPromise;
    await Promise.all([
      db.clear('transactions'),
      db.clear('categories'),
      db.clear('budgets'),
      db.clear('recurringRules'),
      db.clear('savingsGoals'),
      db.clear('metadata')
    ]);
    // Reseed categories and default preferences
    await this.bulkSaveCategories(DEFAULT_CATEGORIES);
    await this.savePreferences(DEFAULT_PREFERENCES);
  }
}

export const localDB = new IndexedDBStorage();
