import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Transaction,
  Category,
  Budget,
  RecurringRule,
  SavingsGoal,
  UserPreferences,
  FinancialDataPayload,
  DEFAULT_CATEGORIES,
  DEFAULT_PREFERENCES
} from '@spendwise/shared';
import { localDB } from '../lib/storage/db';

interface MonthlySummary {
  month: string;
  totalIncome: number; // minor units
  totalExpense: number; // minor units
  remainingBalance: number; // minor units
  savingsRate: number; // percentage (0 - 100)
  totalBudgetLimit: number; // minor units
  totalBudgetSpent: number; // minor units
  budgetUtilization: number; // percentage
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    amount: number;
    percentage: number;
  }>;
}

interface FinancialContextType {
  loading: boolean;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringRules: RecurringRule[];
  savingsGoals: SavingsGoal[];
  preferences: UserPreferences;
  revision: number;
  lastDeletedTransaction: Transaction | null;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  undoDeleteTransaction: () => Promise<void>;
  duplicateTransaction: (id: string) => Promise<Transaction>;
  bulkAddTransactions: (txs: Transaction[]) => Promise<void>;

  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  saveBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  saveRecurringRule: (rule: RecurringRule) => Promise<void>;
  deleteRecurringRule: (id: string) => Promise<void>;
  toggleRecurringRuleStatus: (id: string) => Promise<void>;
  processDueRecurringRule: (ruleId: string) => Promise<Transaction>;

  saveSavingsGoal: (goal: SavingsGoal) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  addGoalContribution: (goalId: string, amount: number, note?: string) => Promise<void>;

  updatePreferences: (pref: Partial<UserPreferences>) => Promise<void>;
  importFinancialData: (payload: FinancialDataPayload, merge?: boolean) => Promise<void>;
  clearAllFinancialData: () => Promise<void>;

  getMonthlySummary: (month: string) => MonthlySummary;
  refreshData: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [revision, setRevision] = useState<number>(1);
  const [lastDeletedTransaction, setLastDeletedTransaction] = useState<Transaction | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [txs, cats, bgs, recs, goals, prefs, rev] = await Promise.all([
        localDB.getAllTransactions(),
        localDB.getAllCategories(),
        localDB.getAllBudgets(),
        localDB.getAllRecurringRules(),
        localDB.getAllSavingsGoals(),
        localDB.getPreferences(),
        localDB.getRevision()
      ]);

      setTransactions(txs);
      setCategories(cats);
      setBudgets(bgs);
      setRecurringRules(recs);
      setSavingsGoals(goals);
      setPreferences(prefs);
      setRevision(rev);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // --- Transactions ---
  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    const now = new Date().toISOString();
    const newTx: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    await localDB.saveTransaction(newTx);
    await refreshData();
    return newTx;
  };

  const updateTransaction = async (tx: Transaction): Promise<void> => {
    const updated: Transaction = {
      ...tx,
      updatedAt: new Date().toISOString()
    };
    await localDB.saveTransaction(updated);
    await refreshData();
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    const existing = transactions.find(t => t.id === id);
    if (existing) {
      setLastDeletedTransaction(existing);
    }
    await localDB.deleteTransaction(id);
    await refreshData();
  };

  const undoDeleteTransaction = async (): Promise<void> => {
    if (lastDeletedTransaction) {
      await localDB.saveTransaction(lastDeletedTransaction);
      setLastDeletedTransaction(null);
      await refreshData();
    }
  };

  const duplicateTransaction = async (id: string): Promise<Transaction> => {
    const existing = transactions.find(t => t.id === id);
    if (!existing) throw new Error('Transaction not found');

    const now = new Date().toISOString();
    const duplicated: Transaction = {
      ...existing,
      id: crypto.randomUUID(),
      date: now.split('T')[0],
      createdAt: now,
      updatedAt: now
    };

    await localDB.saveTransaction(duplicated);
    await refreshData();
    return duplicated;
  };

  const bulkAddTransactions = async (txs: Transaction[]): Promise<void> => {
    await localDB.bulkSaveTransactions(txs);
    await refreshData();
  };

  // --- Categories ---
  const addCategory = async (cat: Omit<Category, 'id'>): Promise<Category> => {
    const newCat: Category = {
      ...cat,
      id: `cat-${crypto.randomUUID().slice(0, 8)}`,
      isDefault: false
    };
    await localDB.saveCategory(newCat);
    await refreshData();
    return newCat;
  };

  const updateCategory = async (cat: Category): Promise<void> => {
    await localDB.saveCategory(cat);
    await refreshData();
  };

  const deleteCategory = async (id: string): Promise<void> => {
    await localDB.deleteCategory(id);
    await refreshData();
  };

  // --- Budgets ---
  const saveBudget = async (budget: Budget): Promise<void> => {
    await localDB.saveBudget(budget);
    await refreshData();
  };

  const deleteBudget = async (id: string): Promise<void> => {
    await localDB.deleteBudget(id);
    await refreshData();
  };

  // --- Recurring Rules ---
  const saveRecurringRule = async (rule: RecurringRule): Promise<void> => {
    await localDB.saveRecurringRule(rule);
    await refreshData();
  };

  const deleteRecurringRule = async (id: string): Promise<void> => {
    await localDB.deleteRecurringRule(id);
    await refreshData();
  };

  const toggleRecurringRuleStatus = async (id: string): Promise<void> => {
    const rule = recurringRules.find(r => r.id === id);
    if (!rule) return;
    const updated: RecurringRule = {
      ...rule,
      status: rule.status === 'active' ? 'paused' : 'active',
      updatedAt: new Date().toISOString()
    };
    await localDB.saveRecurringRule(updated);
    await refreshData();
  };

  const processDueRecurringRule = async (ruleId: string): Promise<Transaction> => {
    const rule = recurringRules.find(r => r.id === ruleId);
    if (!rule) throw new Error('Recurring rule not found');

    // 1. Create the corresponding real transaction
    const now = new Date().toISOString();
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: rule.type,
      amount: rule.amount,
      currency: rule.currency,
      categoryId: rule.categoryId,
      date: rule.nextDueDate,
      paymentMethod: rule.paymentMethod || 'Bank Transfer',
      note: `Recurring: ${rule.name}`,
      tags: ['recurring'],
      createdAt: now,
      updatedAt: now
    };
    await localDB.saveTransaction(tx);

    // 2. Compute the next due date based on frequency
    const currentDue = new Date(rule.nextDueDate);
    let nextDate = new Date(currentDue);

    switch (rule.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'custom':
        nextDate.setDate(nextDate.getDate() + (rule.customIntervalDays || 30));
        break;
    }

    const nextDueDateStr = nextDate.toISOString().split('T')[0];

    const updatedRule: RecurringRule = {
      ...rule,
      nextDueDate: nextDueDateStr,
      updatedAt: now
    };

    await localDB.saveRecurringRule(updatedRule);
    await refreshData();
    return tx;
  };

  // --- Savings Goals ---
  const saveSavingsGoal = async (goal: SavingsGoal): Promise<void> => {
    await localDB.saveSavingsGoal(goal);
    await refreshData();
  };

  const deleteSavingsGoal = async (id: string): Promise<void> => {
    await localDB.deleteSavingsGoal(id);
    await refreshData();
  };

  const addGoalContribution = async (goalId: string, amount: number, note?: string): Promise<void> => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    const newContrib = {
      id: crypto.randomUUID(),
      amount,
      date: new Date().toISOString().split('T')[0],
      note
    };

    const updated: SavingsGoal = {
      ...goal,
      currentAmount: goal.currentAmount + amount,
      contributions: [newContrib, ...goal.contributions],
      updatedAt: new Date().toISOString()
    };

    await localDB.saveSavingsGoal(updated);
    await refreshData();
  };

  // --- Preferences ---
  const updatePreferences = async (pref: Partial<UserPreferences>): Promise<void> => {
    const updated = await localDB.savePreferences(pref);
    setPreferences(updated);
  };

  // --- Import / Restore ---
  const importFinancialData = async (payload: FinancialDataPayload, merge = false): Promise<void> => {
    await localDB.importFullPayload(payload, merge);
    await refreshData();
  };

  const clearAllFinancialData = async (): Promise<void> => {
    await localDB.clearAllData();
    await refreshData();
  };

  // --- Calculated Monthly Summary ---
  const getMonthlySummary = useCallback((month: string): MonthlySummary => {
    const filteredTxs = transactions.filter(t => t.date.startsWith(month));

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: Record<string, number> = {};

    filteredTxs.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
      }
    });

    const remainingBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

    // Budget calculations
    const monthBudgets = budgets.filter(b => b.month === month);
    const overallBudget = monthBudgets.find(b => b.categoryId === 'total');
    let totalBudgetLimit = overallBudget ? overallBudget.limitAmount : 0;

    if (!overallBudget && monthBudgets.length > 0) {
      // Sum individual category budgets
      totalBudgetLimit = monthBudgets.reduce((acc, b) => acc + b.limitAmount, 0);
    }

    const totalBudgetSpent = totalExpense;
    const budgetUtilization = totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

    const catMap = new Map(categories.map(c => [c.id, c]));
    const expensesByCategory = Object.entries(categoryTotals).map(([catId, amount]) => {
      const cat = catMap.get(catId);
      return {
        categoryId: catId,
        categoryName: cat?.name || 'Uncategorized',
        color: cat?.color || '#64748B',
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
      };
    }).sort((a, b) => b.amount - a.amount);

    return {
      month,
      totalIncome,
      totalExpense,
      remainingBalance,
      savingsRate,
      totalBudgetLimit,
      totalBudgetSpent,
      budgetUtilization,
      expensesByCategory
    };
  }, [transactions, budgets, categories]);

  return (
    <FinancialContext.Provider
      value={{
        loading,
        transactions,
        categories,
        budgets,
        recurringRules,
        savingsGoals,
        preferences,
        revision,
        lastDeletedTransaction,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        undoDeleteTransaction,
        duplicateTransaction,
        bulkAddTransactions,
        addCategory,
        updateCategory,
        deleteCategory,
        saveBudget,
        deleteBudget,
        saveRecurringRule,
        deleteRecurringRule,
        toggleRecurringRuleStatus,
        processDueRecurringRule,
        saveSavingsGoal,
        deleteSavingsGoal,
        addGoalContribution,
        updatePreferences,
        importFinancialData,
        clearAllFinancialData,
        getMonthlySummary,
        refreshData
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancial must be used within FinancialProvider');
  return ctx;
};
