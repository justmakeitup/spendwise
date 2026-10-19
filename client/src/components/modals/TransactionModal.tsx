import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, PAYMENT_METHODS } from '@spendwise/shared';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useFinancial } from '../../context/FinancialContext';
import { parseInputToMinorUnits, minorUnitsToInputValue } from '../../lib/currency';
import { CategoryIcon } from '../common/CategoryIcon';
import { ArrowDownRight, ArrowUpRight, Plus, Tag } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  initialTransaction
}) => {
  const { categories, preferences, addTransaction, updateTransaction } = useFinancial();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Credit Card');
  const [note, setNote] = useState<string>('');
  const [tagsStr, setTagsStr] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmountStr(minorUnitsToInputValue(initialTransaction.amount, initialTransaction.currency));
      setCategoryId(initialTransaction.categoryId);
      setDate(initialTransaction.date.split('T')[0]);
      setPaymentMethod(initialTransaction.paymentMethod || 'Credit Card');
      setNote(initialTransaction.note || '');
      setTagsStr((initialTransaction.tags || []).join(', '));
    } else {
      setType('expense');
      setAmountStr('');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Credit Card');
      setNote('');
      setTagsStr('');
      // Set first matching category
      const defaultCat = categories.find(c => c.type === 'expense' || c.type === 'both');
      if (defaultCat) setCategoryId(defaultCat.id);
    }
    setError('');
  }, [initialTransaction, isOpen, categories]);

  // Filter categories by type
  const availableCategories = categories.filter(c => c.type === type || c.type === 'both');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const minorUnits = parseInputToMinorUnits(amountStr, preferences.currency);
    if (!minorUnits || minorUnits <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    if (!date) {
      setError('Please select a date.');
      return;
    }

    const tags = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      setLoading(true);
      if (initialTransaction) {
        await updateTransaction({
          ...initialTransaction,
          type,
          amount: minorUnits,
          currency: preferences.currency,
          categoryId,
          date,
          paymentMethod,
          note: note.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined
        });
      } else {
        await addTransaction({
          type,
          amount: minorUnits,
          currency: preferences.currency,
          categoryId,
          date,
          paymentMethod,
          note: note.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTransaction ? 'Edit Transaction' : 'Record Transaction'}
      description="All records are saved securely in your browser's private storage."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Type Toggle: Expense vs Income */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-elevated border border-surface-border">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              const cat = categories.find(c => c.type === 'expense' || c.type === 'both');
              if (cat) setCategoryId(cat.id);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('income');
              const cat = categories.find(c => c.type === 'income' || c.type === 'both');
              if (cat) setCategoryId(cat.id);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'income'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Income</span>
          </button>
        </div>

        {/* Amount & Currency */}
        <div>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
            leftIcon={<span className="text-xs font-bold text-slate-400">{preferences.currency}</span>}
            className="text-lg font-bold"
          />
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 border border-surface-border rounded-xl bg-surface-elevated/50">
            {availableCategories.map(cat => {
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'hover:bg-white/5 text-slate-300 border border-transparent'
                  }`}
                >
                  <CategoryIcon iconName={cat.icon} color={cat.color} size={14} className="p-1" />
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date and Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              label="Date"
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full bg-surface-elevated/70 border border-surface-border rounded-xl py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m} className="bg-surface text-slate-100">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Note / Description */}
        <div>
          <Input
            label="Note (Optional)"
            placeholder="e.g. Trader Joe's groceries"
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Tags */}
        <div>
          <Input
            label="Tags (Optional, comma-separated)"
            placeholder="e.g. groceries, food, family"
            value={tagsStr}
            onChange={e => setTagsStr(e.target.value)}
            leftIcon={<Tag className="w-3.5 h-3.5" />}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {initialTransaction ? 'Update Record' : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
