import React, { useState } from 'react';
import { SavingsGoal } from '@spendwise/shared';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency, parseInputToMinorUnits, minorUnitsToInputValue } from '../../lib/currency';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  Target,
  Plus,
  Calendar,
  PiggyBank,
  CheckCircle,
  TrendingUp,
  History,
  Edit,
  Trash2,
  Sparkles
} from 'lucide-react';

export const SavingsGoalsView: React.FC = () => {
  const {
    savingsGoals,
    preferences,
    saveSavingsGoal,
    deleteSavingsGoal,
    addGoalContribution
  } = useFinancial();

  // Create/Edit Goal Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [initialAmountStr, setInitialAmountStr] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [note, setNote] = useState('');
  const [modalError, setModalError] = useState('');

  // Add Contribution Modal
  const [isContribModalOpen, setIsContribModalOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [contribAmountStr, setContribAmountStr] = useState('');
  const [contribNote, setContribNote] = useState('');

  // History Drawer/Modal
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null);

  const openAddGoalModal = (goalToEdit?: SavingsGoal) => {
    setModalError('');
    if (goalToEdit) {
      setEditingGoal(goalToEdit);
      setName(goalToEdit.name);
      setTargetAmountStr(minorUnitsToInputValue(goalToEdit.targetAmount, preferences.currency));
      setInitialAmountStr(minorUnitsToInputValue(goalToEdit.currentAmount, preferences.currency));
      setTargetDate(goalToEdit.targetDate);
      setNote(goalToEdit.note || '');
    } else {
      setEditingGoal(null);
      setName('');
      setTargetAmountStr('');
      setInitialAmountStr('0');
      // Default target date: 6 months in future
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setTargetDate(d.toISOString().split('T')[0]);
      setNote('');
    }
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!name.trim()) {
      setModalError('Goal name is required.');
      return;
    }

    const targetMinor = parseInputToMinorUnits(targetAmountStr, preferences.currency);
    const initialMinor = parseInputToMinorUnits(initialAmountStr, preferences.currency);

    if (targetMinor <= 0) {
      setModalError('Target amount must be greater than 0.');
      return;
    }

    if (!targetDate) {
      setModalError('Target completion date is required.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const goal: SavingsGoal = {
        id: editingGoal ? editingGoal.id : crypto.randomUUID(),
        name: name.trim(),
        targetAmount: targetMinor,
        currentAmount: editingGoal ? editingGoal.currentAmount : initialMinor,
        targetDate,
        note: note.trim() || undefined,
        contributions: editingGoal ? editingGoal.contributions : (
          initialMinor > 0 ? [{
            id: crypto.randomUUID(),
            amount: initialMinor,
            date: now.split('T')[0],
            note: 'Initial deposit'
          }] : []
        ),
        createdAt: editingGoal ? editingGoal.createdAt : now,
        updatedAt: now
      };

      await saveSavingsGoal(goal);
      setIsGoalModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save savings goal');
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalId) return;

    const minorUnits = parseInputToMinorUnits(contribAmountStr, preferences.currency);
    if (minorUnits <= 0) return;

    await addGoalContribution(activeGoalId, minorUnits, contribNote.trim() || undefined);
    setIsContribModalOpen(false);
    setContribAmountStr('');
    setContribNote('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Savings Goals & Milestones</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Set deliberate targets for emergency funds, vacations, gadgets, or major purchases.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => openAddGoalModal()}
          icon={<Plus className="w-4 h-4" />}
          className="shrink-0"
        >
          New Savings Goal
        </Button>
      </div>

      {/* Goals Grid */}
      {savingsGoals.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500 bg-surface rounded-2xl border border-surface-border">
          <PiggyBank className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
          <p className="font-semibold text-slate-300">No savings targets set yet</p>
          <p className="mt-1">Turn your financial goals into achievable milestones.</p>
          <Button size="sm" variant="outline" onClick={() => openAddGoalModal()} className="mt-4">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Goal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savingsGoals.map(goal => {
            const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            // Estimate pace: average monthly contribution
            let paceText = 'Accumulating...';
            if (goal.contributions.length > 1) {
              const totalContributed = goal.contributions.reduce((s, c) => s + c.amount, 0);
              const avg = Math.round(totalContributed / goal.contributions.length);
              paceText = `Avg ${formatCurrency(avg, preferences.currency, preferences.locale)} / contribution`;
            }

            return (
              <div
                key={goal.id}
                className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel glow-hover flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-100 truncate">{goal.name}</h4>
                      {goal.note && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{goal.note}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openAddGoalModal(goal)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteSavingsGoal(goal.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Big Amount & Target */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-emerald-400">
                        {formatCurrency(goal.currentAmount, preferences.currency, preferences.locale)}
                      </span>
                      <span className="text-xs text-slate-400">
                        of {formatCurrency(goal.targetAmount, preferences.currency, preferences.locale)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-elevated h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-gradient-to-r from-emerald-500 to-electric-mint'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1 text-slate-400">
                      <span>{isCompleted ? '🎉 Goal Achieved!' : `${formatCurrency(remaining, preferences.currency, preferences.locale)} to go`}</span>
                      <span className="font-bold text-slate-200">{pct}%</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-border text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Target: {goal.targetDate}</span>
                      </span>
                      <button
                        onClick={() => setHistoryGoal(goal)}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <History className="w-3 h-3" />
                        <span>{goal.contributions.length} deposits</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">{paceText}</p>
                  </div>
                </div>

                {/* Quick Add Contribution Button */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setActiveGoalId(goal.id);
                    setContribAmountStr('');
                    setContribNote('');
                    setIsContribModalOpen(true);
                  }}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="w-full text-xs justify-center"
                >
                  Add Deposit / Contribution
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title={editingGoal ? 'Edit Savings Goal' : 'Define New Savings Goal'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {modalError}
            </div>
          )}

          <Input
            label="Goal Name"
            placeholder="e.g. Rainy Day Fund, Summer Trip, New Laptop"
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <Input
            label="Target Amount"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            value={targetAmountStr}
            onChange={e => setTargetAmountStr(e.target.value)}
            leftIcon={<span className="text-xs font-bold text-slate-400">{preferences.currency}</span>}
          />

          {!editingGoal && (
            <Input
              label="Initial Amount Already Saved"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={initialAmountStr}
              onChange={e => setInitialAmountStr(e.target.value)}
              leftIcon={<span className="text-xs font-bold text-slate-400">{preferences.currency}</span>}
            />
          )}

          <Input
            label="Target Date"
            type="date"
            required
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
          />

          <Input
            label="Note / Purpose (Optional)"
            placeholder="e.g. 3 months of emergency expenses"
            value={note}
            onChange={e => setNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
            <Button type="button" variant="ghost" onClick={() => setIsGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contribution Modal */}
      <Modal
        isOpen={isContribModalOpen}
        onClose={() => setIsContribModalOpen(false)}
        title="Deposit into Savings Goal"
        maxWidth="sm"
      >
        <form onSubmit={handleAddContribution} className="space-y-4">
          <Input
            label="Deposit Amount"
            type="number"
            step="0.01"
            min="0"
            required
            autoFocus
            placeholder="0.00"
            value={contribAmountStr}
            onChange={e => setContribAmountStr(e.target.value)}
            leftIcon={<span className="text-xs font-bold text-slate-400">{preferences.currency}</span>}
          />

          <Input
            label="Note (Optional)"
            placeholder="e.g. Monthly transfer, side-gig bonus"
            value={contribNote}
            onChange={e => setContribNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
            <Button type="button" variant="ghost" onClick={() => setIsContribModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Deposit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contribution History Modal */}
      {historyGoal && (
        <Modal
          isOpen={!!historyGoal}
          onClose={() => setHistoryGoal(null)}
          title={`Contribution History: ${historyGoal.name}`}
          maxWidth="md"
        >
          <div className="space-y-3">
            {historyGoal.contributions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No deposits recorded yet.</p>
            ) : (
              <div className="divide-y divide-surface-border max-h-64 overflow-y-auto">
                {historyGoal.contributions.map(c => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-slate-200">{c.note || 'Savings Deposit'}</p>
                      <p className="text-[10px] text-slate-400">{c.date}</p>
                    </div>
                    <span className="font-bold text-emerald-400">
                      +{formatCurrency(c.amount, preferences.currency, preferences.locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-3 border-t border-surface-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setHistoryGoal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
