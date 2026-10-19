import React, { useState } from 'react';
import { RecurringRule, RecurringFrequency, TransactionType } from '@spendwise/shared';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, parseInputToMinorUnits, minorUnitsToInputValue } from '../../lib/currency';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  Repeat,
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';

export const RecurringView: React.FC = () => {
  const {
    recurringRules,
    categories,
    preferences,
    saveRecurringRule,
    deleteRecurringRule,
    toggleRecurringRuleStatus,
    processDueRecurringRule
  } = useFinancial();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [customDays, setCustomDays] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [modalError, setModalError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const openAddModal = (ruleToEdit?: RecurringRule) => {
    setModalError('');
    if (ruleToEdit) {
      setEditingRule(ruleToEdit);
      setName(ruleToEdit.name);
      setType(ruleToEdit.type);
      setAmountStr(minorUnitsToInputValue(ruleToEdit.amount, ruleToEdit.currency));
      setCategoryId(ruleToEdit.categoryId);
      setFrequency(ruleToEdit.frequency);
      setCustomDays(ruleToEdit.customIntervalDays ? String(ruleToEdit.customIntervalDays) : '30');
      setStartDate(ruleToEdit.startDate);
      setEndDate(ruleToEdit.endDate || '');
      setNextDueDate(ruleToEdit.nextDueDate);
      setPaymentMethod(ruleToEdit.paymentMethod || 'Credit Card');
    } else {
      setEditingRule(null);
      setName('');
      setType('expense');
      setAmountStr('');
      const defaultCat = categories.find(c => c.type === 'expense' || c.type === 'both');
      setCategoryId(defaultCat ? defaultCat.id : categories[0]?.id || '');
      setFrequency('monthly');
      setCustomDays('30');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate('');
      setNextDueDate(today);
      setPaymentMethod('Credit Card');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!name.trim()) {
      setModalError('Rule name is required.');
      return;
    }

    const minorUnits = parseInputToMinorUnits(amountStr, preferences.currency);
    if (minorUnits <= 0) {
      setModalError('Amount must be positive.');
      return;
    }

    if (!categoryId) {
      setModalError('Category is required.');
      return;
    }

    if (!startDate || !nextDueDate) {
      setModalError('Start date and next due date are required.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const rule: RecurringRule = {
        id: editingRule ? editingRule.id : crypto.randomUUID(),
        name: name.trim(),
        type,
        amount: minorUnits,
        currency: preferences.currency,
        categoryId,
        frequency,
        customIntervalDays: frequency === 'custom' ? parseInt(customDays, 10) || 30 : undefined,
        startDate,
        endDate: endDate ? endDate : undefined,
        nextDueDate,
        paymentMethod,
        status: editingRule ? editingRule.status : 'active',
        createdAt: editingRule ? editingRule.createdAt : now,
        updatedAt: now
      };

      await saveRecurringRule(rule);
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save recurring rule');
    }
  };

  const handleRecordTransaction = async (ruleId: string) => {
    try {
      setProcessingId(ruleId);
      await processDueRecurringRule(ruleId);
    } catch (err: any) {
      alert(`Error recording transaction: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-emerald-400" />
            <span>Recurring Bills & Subscriptions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track commitments without prematurely fabricating fake transactions. Record them when paid.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => openAddModal()}
          icon={<Plus className="w-4 h-4" />}
          className="shrink-0"
        >
          Add Recurring Rule
        </Button>
      </div>

      {/* Rules List */}
      {recurringRules.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500 bg-surface rounded-2xl border border-surface-border">
          <Repeat className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
          <p className="font-semibold text-slate-300">No recurring rules established</p>
          <p className="mt-1">Add monthly rent, subscriptions, salary, or loan payments.</p>
          <Button size="sm" variant="outline" onClick={() => openAddModal()} className="mt-4">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Recurring Rule
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurringRules.map(rule => {
            const cat = categories.find(c => c.id === rule.categoryId);
            const isIncome = rule.type === 'income';
            const isPaused = rule.status === 'paused';
            const isDueSoon = new Date(rule.nextDueDate) <= new Date();

            return (
              <div
                key={rule.id}
                className={`p-5 rounded-2xl bg-surface border transition-all ${
                  isPaused
                    ? 'border-surface-border opacity-60'
                    : isDueSoon
                    ? 'border-amber-500/40 bg-surface-elevated/40'
                    : 'border-surface-border glass-panel glow-hover'
                } flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon
                        iconName={cat?.icon || 'CircleDollarSign'}
                        color={cat?.color}
                        size={16}
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-200 truncate">{rule.name}</h4>
                        <span className="text-[10px] text-slate-400 capitalize">{rule.frequency} frequency</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleRecurringRuleStatus(rule.id)}
                        title={isPaused ? 'Resume' : 'Pause'}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openAddModal(rule)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteRecurringRule(rule.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-3">
                    <span className={`text-xl font-black ${isIncome ? 'text-emerald-400' : 'text-slate-100'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(rule.amount, rule.currency, preferences.locale)}
                    </span>
                    <span className="text-xs text-slate-400">{cat?.name}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-border text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      <span>Next Due: <strong className="text-slate-200">{rule.nextDueDate}</strong></span>
                    </span>
                    {isDueSoon && !isPaused && (
                      <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Due Now
                      </span>
                    )}
                  </div>
                </div>

                {/* 1-Click Action to record transaction */}
                <Button
                  size="sm"
                  variant={isDueSoon ? 'primary' : 'secondary'}
                  disabled={isPaused || processingId === rule.id}
                  loading={processingId === rule.id}
                  onClick={() => handleRecordTransaction(rule.id)}
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  className="w-full text-xs justify-center"
                >
                  Confirm & Record Transaction
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Recurring Rule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? 'Edit Recurring Rule' : 'New Recurring Commitment'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-elevated border border-surface-border text-xs">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                type === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" /> Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                type === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> Income
            </button>
          </div>

          <Input
            label="Name / Description"
            placeholder="e.g. Netflix, Apartment Rent, Gym"
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
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
            />

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as any)}
                className="w-full bg-surface-elevated/70 border border-surface-border rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom Days</option>
              </select>
            </div>
          </div>

          {frequency === 'custom' && (
            <Input
              label="Repeat every X days"
              type="number"
              min="1"
              value={customDays}
              onChange={e => setCustomDays(e.target.value)}
            />
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full bg-surface-elevated/70 border border-surface-border rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              required
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <Input
              label="Next Due Date"
              type="date"
              required
              value={nextDueDate}
              onChange={e => setNextDueDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
