import React, { useState } from 'react';
import { Budget } from '@spendwise/shared';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, parseInputToMinorUnits, minorUnitsToInputValue } from '../../lib/currency';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  TrendingDown,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

interface BudgetsViewProps {
  selectedMonth: string;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ selectedMonth }) => {
  const {
    budgets,
    categories,
    transactions,
    preferences,
    saveBudget,
    deleteBudget
  } = useFinancial();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetType, setBudgetType] = useState<'total' | 'category'>('category');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [rolloverEnabled, setRolloverEnabled] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');

  const currentMonthBudgets = budgets.filter(b => b.month === selectedMonth);
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  // Compute total spending for this month
  const totalSpent = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Compute category spending map
  const categorySpentMap: Record<string, number> = {};
  currentMonthTransactions.forEach(t => {
    if (t.type === 'expense') {
      categorySpentMap[t.categoryId] = (categorySpentMap[t.categoryId] || 0) + t.amount;
    }
  });

  const overallBudget = currentMonthBudgets.find(b => b.categoryId === 'total');
  const categoryBudgets = currentMonthBudgets.filter(b => b.categoryId !== 'total');

  const openAddModal = (budgetToEdit?: Budget) => {
    setModalError('');
    if (budgetToEdit) {
      setEditingBudget(budgetToEdit);
      setBudgetType(budgetToEdit.categoryId === 'total' ? 'total' : 'category');
      setSelectedCatId(budgetToEdit.categoryId === 'total' ? '' : budgetToEdit.categoryId);
      setAmountInput(minorUnitsToInputValue(budgetToEdit.limitAmount, preferences.currency));
      setRolloverEnabled(!!budgetToEdit.rolloverEnabled);
    } else {
      setEditingBudget(null);
      setBudgetType('category');
      setSelectedCatId(categories[0]?.id || '');
      setAmountInput('');
      setRolloverEnabled(preferences.budgetRolloverDefault);
    }
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const minorUnits = parseInputToMinorUnits(amountInput, preferences.currency);
    if (minorUnits <= 0) {
      setModalError('Budget limit must be greater than 0.');
      return;
    }

    const catId = budgetType === 'total' ? 'total' : selectedCatId;
    if (!catId) {
      setModalError('Please select a category.');
      return;
    }

    try {
      const newBudget: Budget = {
        id: editingBudget ? editingBudget.id : crypto.randomUUID(),
        month: selectedMonth,
        categoryId: catId,
        limitAmount: minorUnits,
        rolloverEnabled
      };
      await saveBudget(newBudget);
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save budget');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <span>Monthly Budget Allocations ({selectedMonth})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Set and track spending boundaries with threshold alerts at 75%, 90%, and 100%.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => openAddModal()}
          icon={<Plus className="w-4 h-4" />}
          className="shrink-0"
        >
          Add Budget Target
        </Button>
      </div>

      {/* Overall Monthly Budget Card */}
      {overallBudget && (
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Overall Monthly Budget</h3>
                <p className="text-xs text-slate-400">Total expenditure ceiling for all categories</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => openAddModal(overallBudget)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteBudget(overallBudget.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {(() => {
            const utilization = Math.round((totalSpent / overallBudget.limitAmount) * 100);
            const remaining = overallBudget.limitAmount - totalSpent;
            const isExceeded = utilization >= 100;
            const isWarning = utilization >= 80;

            return (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">
                    Spent: <strong>{formatCurrency(totalSpent, preferences.currency, preferences.locale)}</strong> of{' '}
                    {formatCurrency(overallBudget.limitAmount, preferences.currency, preferences.locale)}
                  </span>
                  <span className={`font-bold ${isExceeded ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {utilization}% Used ({formatCurrency(remaining, preferences.currency, preferences.locale)} {remaining >= 0 ? 'left' : 'over'})
                  </span>
                </div>
                <div className="w-full bg-surface-elevated h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Category Budgets Grid */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Category Budgets ({categoryBudgets.length})
        </h3>

        {categoryBudgets.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-surface rounded-2xl border border-surface-border">
            <PieChart className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
            <p className="font-semibold text-slate-300">No category budgets created for this month</p>
            <p className="mt-1">Define limits on Groceries, Dining, Rent, or Shopping.</p>
            <Button size="sm" variant="outline" onClick={() => openAddModal()} className="mt-4">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Category Budget
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBudgets.map(b => {
              const cat = categories.find(c => c.id === b.categoryId);
              const spent = categorySpentMap[b.categoryId] || 0;
              const utilization = Math.round((spent / b.limitAmount) * 100);
              const remaining = b.limitAmount - spent;
              const isExceeded = utilization >= 100;
              const isWarning = utilization >= 80;

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel glow-hover space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon
                        iconName={cat?.icon || 'CircleDollarSign'}
                        color={cat?.color}
                        size={16}
                      />
                      <span className="font-bold text-xs text-slate-200 truncate">{cat?.name || 'Category'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openAddModal(b)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteBudget(b.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        {formatCurrency(spent, preferences.currency, preferences.locale)} spent
                      </span>
                      <span className="font-semibold text-slate-200">
                        {formatCurrency(b.limitAmount, preferences.currency, preferences.locale)}
                      </span>
                    </div>

                    <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className={isExceeded ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                        {isExceeded ? 'Budget Exceeded!' : `${formatCurrency(remaining, preferences.currency, preferences.locale)} remaining`}
                      </span>
                      <span className="font-bold text-slate-300">{utilization}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBudget ? 'Edit Budget Target' : 'Create Monthly Budget'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {modalError}
            </div>
          )}

          {/* Budget Scope Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-elevated border border-surface-border text-xs">
            <button
              type="button"
              onClick={() => setBudgetType('category')}
              className={`py-2 rounded-lg font-semibold transition-colors ${
                budgetType === 'category' ? 'bg-surface text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Specific Category
            </button>
            <button
              type="button"
              onClick={() => setBudgetType('total')}
              className={`py-2 rounded-lg font-semibold transition-colors ${
                budgetType === 'total' ? 'bg-surface text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overall Month Total
            </button>
          </div>

          {budgetType === 'category' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Category</label>
              <select
                value={selectedCatId}
                onChange={e => setSelectedCatId(e.target.value)}
                className="w-full bg-surface-elevated/70 border border-surface-border rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Input
              label="Budget Monthly Limit"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              leftIcon={<span className="text-xs font-bold text-slate-400">{preferences.currency}</span>}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rollover"
              checked={rolloverEnabled}
              onChange={e => setRolloverEnabled(e.target.checked)}
              className="rounded bg-surface-elevated border-surface-border text-emerald-500 focus:ring-0"
            />
            <label htmlFor="rollover" className="text-xs text-slate-300 select-none cursor-pointer">
              Enable Rollover (Carries over unspent balances into next month)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Budget
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
